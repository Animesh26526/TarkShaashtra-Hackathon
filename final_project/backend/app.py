import os
from flask_cors import CORS
import io
import csv
import base64
from datetime import datetime, timedelta

from flask import (Flask, render_template, redirect, url_for,
                   request, flash, session, jsonify, Response, make_response)
from flask_login import (LoginManager, login_user, logout_user,
                         login_required, current_user)
from werkzeug.security import generate_password_hash, check_password_hash
from dotenv import load_dotenv

import google.generativeai as genai

from models import db, User, Complaint
from resolvo_engine import (classify_complaint, analyze_sentiment,
                            determine_priority, generate_resolution,
                            get_confidence, get_sla_hours)
from appwrite_sync import (
    sync_complaint_to_appwrite, fetch_complaints_from_appwrite,
    test_connection as appwrite_test_connection, sync_all_complaints,
    ensure_bucket_exists, upload_image
)

load_dotenv()

app = Flask(__name__)
app.config['SECRET_KEY'] = os.getenv('SECRET_KEY', 'dev-secret-key-12345')
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///resolvo.db'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

db.init_app(app)
CORS(app)

login_manager = LoginManager()
login_manager.login_view = 'login'
login_manager.init_app(app)

# Client will be created dynamically per-request to support multiple keys

APPWRITE_CFG = {
    'endpoint': os.getenv('APPWRITE_ENDPOINT', 'https://sgp.cloud.appwrite.io/v1'),
    'project_id': os.getenv('APPWRITE_PROJECT_ID', '69e34dd9002fef599d7d'),
    'db_id': os.getenv('APPWRITE_DB_ID', '69e358ca00268f874126'),
    'col_id': os.getenv('APPWRITE_COL_ID', '69e358cd00179dcf5bb7'),
}


@login_manager.user_loader
def load_user(user_id):
    return User.query.get(int(user_id))


# ─── API Health Check ─────────────────────────────────────────────────────────

@app.route('/')
def index_redirect():
    return jsonify({"status": "ok", "service": "Resolvo API", "version": "2.0"})


# ─── Model Fallback Helper ────────────────────────────────────────────────────

MODEL_FALLBACK_CHAIN = [
    'gemma-4-31b-it',       # Primary fallback
    'gemma-4-26b-a4b-it',   # Retry (transient errors)
    'gemma-3-27b-it',       # Secondary fallback
    'gemini-3.1-flash-lite' # Last resort
]


def call_with_fallback(contents, system_instruction, temperature=0.1, preferred_model=None, fallback_chain=None):
    """Try the preferred model first, then fall through the chain.
    Returns (response_text, model_used) or raises after all fail."""
    chain = []
    if preferred_model:
        chain.append(preferred_model)
    if fallback_chain is not None:
        chain.extend(fallback_chain)
    else:
        chain.extend(MODEL_FALLBACK_CHAIN)

    # Gather all API keys from .env
    keys_to_try = []
    base_key = os.getenv('GEMINI_API_KEY')
    if base_key: keys_to_try.append(base_key)
    for i in range(1, 10):
        k = os.getenv(f'GEMINI_API_KEY_{i}')
        if k and k not in keys_to_try:
            keys_to_try.append(k)
            
    if not keys_to_try:
        raise Exception("No API keys found in environment variables.")

    last_error = None
    for mdl in chain:
        for api_key in keys_to_try:
            try:
                genai.configure(api_key=api_key)
                model_obj = genai.GenerativeModel(model_name=mdl, system_instruction=system_instruction)
                response = model_obj.generate_content(
                    contents,
                    generation_config=genai.types.GenerationConfig(
                        temperature=temperature
                    )
                )
                print(f"[SUCCESS] Model {mdl} succeeded")
                return response.text, mdl
            except Exception as e:
                err_str = str(e).lower()
                print(f"[FAILED] Model {mdl} failed: {e}")
                last_error = e
                # If error is related to API key, quota, or invalid argument (like expired key), try next key
                if 'api' in err_str or 'key' in err_str or 'quota' in err_str or '429' in err_str or '400' in err_str:
                    continue
                # If it's a model-specific error (like model not found), break and try the next model
                break

    raise Exception(f"All models and keys failed. Last: {last_error}")


# ─── AI Chat API ──────────────────────────────────────────────────────────────

SYSTEM_INSTRUCTION = """You are a helpful customer support AI for a wellness packaged water bottle company.
Assess the user's text (and any uploaded visual context) to resolve their issue. Change mood based on their cooperativeness on a scale from 1.0 to -1.0. Citing specific methods for resolution is mandatory.

CRITICAL: Return strictly valid JSON only. No markdown.
{
  "reply": "Your conversational reply",
  "category": "Product|Packaging|Trade|Unknown",
  "mood": 0.0,
  "priority": "High|Medium|Low"
}"""


@app.route('/api/chat', methods=['POST'])
def api_chat():
    try:
        data = request.json
        history = data.get('history', [])
        contents = []
        for msg in history:
            role = "model" if msg['role'] == "assistant" else "user"
            parts = []
            if msg.get('content'):
                parts.append(msg['content'])
            if msg.get('image_base64'):
                b64 = msg['image_base64']
                if ',' in b64:
                    mime_type = b64.split(';')[0].split(':')[1]
                    b64 = b64.split(',')[1]
                else:
                    mime_type = 'image/jpeg'
                img_bytes = base64.b64decode(b64)
                parts.append({"mime_type": mime_type, "data": img_bytes})
            contents.append({"role": role, "parts": parts})

        preferred = data.get('model', 'gemma-4-31b-it')
        text, used = call_with_fallback(contents, SYSTEM_INSTRUCTION, 0.1, preferred)
        return jsonify({"content": text, "model_used": used})
    except Exception as e:
        print("API Error:", e)
        return jsonify({"error": str(e)}), 500


# ─── Phone Simulation API ───────────────────────────────────────────────────────

@app.route('/api/phone-sim', methods=['POST'])
def api_phone_sim():
    try:
        data = request.json
        digits = data.get('digits', '')
        
        system_instruction = """You are an automated IVR system for Resolvo packaged water bottles.
The customer has dialed the following digits on their phone keypad. Based on the sequence, respond concisely with an automated voice menu or simulated action (e.g. 'You entered 1 for packaging. Please state your issue.'). Keep it brief and robotic but helpful."""
        
        prompt = f"The user dialed: {digits}. What is the system's voice response?"
        
        text, used = call_with_fallback(prompt, system_instruction, 0.2, 'gemma-4-31b-it')
        return jsonify({"reply": text, "model_used": used})
    except Exception as e:
        print("Phone Sim Error:", e)
        return jsonify({"error": str(e)}), 500


# ─── Audio STT API ────────────────────────────────────────────────────────────

AUDIO_SYSTEM_INSTRUCTION = """You are a customer support AI processing audio about packaged water bottle issues.
Listen carefully and respond with ONLY valid JSON (no markdown):
{
  "transcript": "Full transcription of customer speech",
  "reply": "Your helpful response",
  "category": "Product|Packaging|Trade|Unknown",
  "mood": 0.0,
  "priority": "High|Medium|Low",
  "resolution": "Recommended resolution action"
}"""


@app.route('/api/audio', methods=['POST'])
def api_audio():
    try:
        if 'audio' not in request.files:
            return jsonify({"error": "No audio file provided"}), 400
        audio_file = request.files['audio']
        audio_bytes = audio_file.read()
        if len(audio_bytes) < 100:
            return jsonify({"error": "Audio file too small"}), 400
        mime_type = audio_file.content_type or 'audio/webm'
        parts = [
            {"mime_type": mime_type, "data": audio_bytes},
            "Transcribe this audio and analyze the customer complaint."
        ]
        contents = [{"role": "user", "parts": parts}]
        text, used = call_with_fallback(
            contents, AUDIO_SYSTEM_INSTRUCTION, 0.1, 
            preferred_model='gemini-2.0-flash',
            fallback_chain=['gemini-2.5-flash', 'gemini-1.5-pro', 'gemini-1.5-flash']
        )
        return jsonify({"content": text, "model_used": used})
    except Exception as e:
        print("Audio API Error:", e)
        return jsonify({"error": str(e)}), 500


# ─── Complaint CRUD API ───────────────────────────────────────────────────────

def get_next_complaint_id():
    last = Complaint.query.order_by(Complaint.id.desc()).first()
    if not last:
        return 'CMP-001'
    try:
        num = int(last.id.split('-')[1]) + 1
    except (ValueError, IndexError):
        num = Complaint.query.count() + 1
    return f"CMP-{num:03d}"


def process_complaint_data(data):
    content = data.get('description') or data.get('emailBody') or ''
    sentiment = analyze_sentiment(content)
    category = data.get('category') or classify_complaint(content)
    priority = data.get('priority') or determine_priority(content, sentiment)
    resolution_data = generate_resolution(category)
    confidence = get_confidence(content)
    sla_hours = get_sla_hours(priority)
    ctype = data.get('type', 'Text')
    cid = get_next_complaint_id()

    if ctype == 'Email':
        title = data.get('title') or f"Email: {data.get('emailSubject', 'Untitled')}"
    elif ctype == 'Call':
        title = data.get('title') or f"Call from {data.get('phoneNumber', 'Unknown')}"
    elif ctype == 'Audio':
        title = data.get('title') or "Live Audio Complaint"
    else:
        title = data.get('title') or 'Text Complaint'

    complaint = Complaint(
        id=cid, title=title, description=content,
        category=category, priority=priority, status='Open',
        sentiment_label=sentiment['label'], sentiment_score=sentiment['score'],
        sentiment_icon=sentiment['icon'],
        resolution=resolution_data['action'],
        resolution_explanation=resolution_data['explanation'],
        confidence=confidence,
        sla_deadline=datetime.utcnow() + timedelta(hours=sla_hours),
        created_at=datetime.utcnow(),
        resolution_time=data.get('resolution_time'),
        complaint_type=ctype,
        phone_number=data.get('phoneNumber'),
        email_subject=data.get('emailSubject'),
        assigned_to=data.get('assignedTo', 'Auto Assigned'),
        escalated=data.get('escalated', False),
        attempts=data.get('attempts', 1),
        user_id=current_user.id if current_user.is_authenticated else None,
    )
    return complaint


@app.route('/api/complaints', methods=['GET'])
def get_complaints():
    complaints = Complaint.query.order_by(Complaint.created_at.desc()).all()
    return jsonify([c.to_dict() for c in complaints])


@app.route('/api/complaints', methods=['POST'])
def create_complaint():
    data = request.json
    complaint = process_complaint_data(data)
    db.session.add(complaint)
    try:
        db.session.commit()
        # Sync to Appwrite cloud in background (non-blocking)
        try:
            sync_complaint_to_appwrite(complaint.to_dict(), image_base64=data.get('attachment'))
            complaint.appwrite_synced = True
            db.session.commit()
        except Exception as sync_err:
            print(f"[Appwrite Sync] Non-critical: {sync_err}")
        return jsonify(complaint.to_dict()), 201
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": str(e)}), 500


@app.route('/api/complaints/<complaint_id>', methods=['PATCH'])
def update_complaint(complaint_id):
    complaint = Complaint.query.get(complaint_id)
    if not complaint:
        return jsonify({"error": "Not found"}), 404
    updates = request.json
    for key, value in updates.items():
        if key == 'status':
            complaint.status = value
            if value == 'Resolved':
                complaint.resolved_at = datetime.utcnow()
                if complaint.created_at:
                    delta = datetime.utcnow() - complaint.created_at
                    complaint.resolution_time = int(delta.total_seconds() / 3600)
        elif key == 'escalated':
            complaint.escalated = value
            if value: complaint.status = 'Escalated'
        elif key == 'assignedTo': complaint.assigned_to = value
        elif key == 'priority': complaint.priority = value
    db.session.commit()
    
    # Sync status updates to Appwrite
    try:
        from appwrite_sync import update_complaint_status_appwrite
        update_complaint_status_appwrite(complaint.id, complaint.status, complaint.resolution_time)
    except Exception as e:
        print(f"Appwrite status sync error: {e}")

    return jsonify(complaint.to_dict())


@app.route('/api/complaints/<complaint_id>', methods=['GET'])
def get_complaint(complaint_id):
    complaint = Complaint.query.get(complaint_id)
    if not complaint:
        return jsonify({"error": "Not found"}), 404
    return jsonify(complaint.to_dict())


@app.route('/api/classify', methods=['POST'])
def api_classify():
    data = request.json
    description = data.get('description', '')
    sentiment = analyze_sentiment(description)
    category = classify_complaint(description)
    priority = determine_priority(description, sentiment)
    confidence = get_confidence(description)
    resolution_data = generate_resolution(category)
    return jsonify({
        'category': category, 'sentiment': sentiment,
        'priority': priority, 'confidence': confidence,
        'resolution': resolution_data['action'],
        'explanation': resolution_data['explanation']
    })


# ─── Stats API ────────────────────────────────────────────────────────────────

@app.route('/api/stats', methods=['GET'])
def api_stats():
    total = Complaint.query.count()
    open_count = Complaint.query.filter_by(status='Open').count()
    resolved = Complaint.query.filter_by(status='Resolved').count()
    escalated = Complaint.query.filter_by(escalated=True).count()
    high_open = Complaint.query.filter_by(priority='High', status='Open').count()

    product = Complaint.query.filter_by(category='Product').count()
    packaging = Complaint.query.filter_by(category='Packaging').count()
    trade = Complaint.query.filter_by(category='Trade').count()

    high = Complaint.query.filter_by(priority='High').count()
    medium = Complaint.query.filter_by(priority='Medium').count()
    low = Complaint.query.filter_by(priority='Low').count()

    resolved_complaints = Complaint.query.filter(Complaint.resolution_time.isnot(None)).all()
    avg_resolution = 0
    if resolved_complaints:
        avg_resolution = sum(c.resolution_time for c in resolved_complaints) / len(resolved_complaints)

    now = datetime.utcnow()
    sla_breached = Complaint.query.filter(
        Complaint.status != 'Resolved', Complaint.sla_deadline < now
    ).count()
    in_progress = Complaint.query.filter_by(status='In Progress').count()

    return jsonify({
        'total': total, 'open': open_count, 'resolved': resolved,
        'escalated': escalated, 'slaAtRisk': high_open, 'slaBreached': sla_breached,
        'inProgress': in_progress,
        'avgResolutionTime': round(avg_resolution, 1),
        'categories': {'Product': product, 'Packaging': packaging, 'Trade': trade},
        'priorities': {'High': high, 'Medium': medium, 'Low': low}
    })


# ─── Export: CSV ──────────────────────────────────────────────────────────────

@app.route('/api/export/csv', methods=['GET'])
def export_csv():
    # Support filtered export for Ops Manager backup
    cat = request.args.get('category')
    pri = request.args.get('priority')
    status = request.args.get('status')
    date_from = request.args.get('from')
    date_to = request.args.get('to')

    query = Complaint.query.order_by(Complaint.created_at.desc())
    if cat and cat != 'All': query = query.filter_by(category=cat)
    if pri and pri != 'All': query = query.filter_by(priority=pri)
    if status and status != 'All': query = query.filter_by(status=status)
    if date_from:
        try: query = query.filter(Complaint.created_at >= datetime.fromisoformat(date_from))
        except: pass
    if date_to:
        try: query = query.filter(Complaint.created_at <= datetime.fromisoformat(date_to))
        except: pass

    complaints = query.all()
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(['complaint_id', 'title', 'description', 'category', 'priority',
                     'sentiment_score', 'sentiment_label', 'resolution_time_hrs',
                     'status', 'resolution', 'resolution_explanation',
                     'assigned_to', 'sla_deadline', 'created_at', 'resolved_at',
                     'channel', 'escalated', 'confidence'])
    for c in complaints:
        writer.writerow([
            c.id, c.title, c.description or '', c.category, c.priority,
            c.sentiment_score, c.sentiment_label, c.resolution_time,
            c.status, c.resolution, c.resolution_explanation,
            c.assigned_to,
            c.sla_deadline.isoformat() if c.sla_deadline else '',
            c.created_at.isoformat() if c.created_at else '',
            c.resolved_at.isoformat() if c.resolved_at else '',
            c.complaint_type, c.escalated, c.confidence
        ])

    response = make_response(output.getvalue())
    response.headers['Content-Type'] = 'text/csv'
    response.headers['Content-Disposition'] = 'attachment; filename=resolvo_backup.csv'
    return response


# ─── Export: Full Complaint PDF Report ────────────────────────────────────────

@app.route('/api/export/pdf', methods=['GET'])
@app.route('/api/export/pdf/<complaint_id>', methods=['GET'])
def export_pdf(complaint_id=None):
    try:
        from reportlab.lib.pagesizes import A4
        from reportlab.lib import colors
        from reportlab.lib.units import mm
        from reportlab.platypus import (SimpleDocTemplate, Table, TableStyle,
                                        Paragraph, Spacer, HRFlowable)
        from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
        from reportlab.lib.enums import TA_LEFT, TA_CENTER

        buffer = io.BytesIO()
        doc = SimpleDocTemplate(buffer, pagesize=A4,
                                leftMargin=20*mm, rightMargin=20*mm,
                                topMargin=15*mm, bottomMargin=15*mm)
        styles = getSampleStyleSheet()
        elements = []

        # Custom styles
        title_style = ParagraphStyle('ResolvoTitle', parent=styles['Title'],
                                     fontSize=18, textColor=colors.HexColor('#2563eb'),
                                     spaceAfter=4)
        subtitle_style = ParagraphStyle('Sub', parent=styles['Normal'],
                                        fontSize=9, textColor=colors.HexColor('#64748b'),
                                        spaceAfter=12)
        heading_style = ParagraphStyle('SectionHead', parent=styles['Heading2'],
                                       fontSize=12, textColor=colors.HexColor('#1e293b'),
                                       spaceBefore=14, spaceAfter=6)
        body_style = ParagraphStyle('Body', parent=styles['Normal'],
                                    fontSize=9, leading=14,
                                    textColor=colors.HexColor('#475569'))
        label_style = ParagraphStyle('Label', parent=styles['Normal'],
                                     fontSize=8, textColor=colors.HexColor('#94a3b8'),
                                     spaceAfter=2)
        value_style = ParagraphStyle('Value', parent=styles['Normal'],
                                     fontSize=10, textColor=colors.HexColor('#1e293b'),
                                     fontName='Helvetica-Bold', spaceAfter=8)

        if complaint_id:
            # ─── Single Complaint Full Detail Report ───
            c = Complaint.query.get(complaint_id)
            if not c:
                return jsonify({"error": "Not found"}), 404

            elements.append(Paragraph("RESOLVO - Complaint Detail Report", title_style))
            elements.append(Paragraph(
                f"Generated: {datetime.utcnow().strftime('%Y-%m-%d %H:%M UTC')} | Complaint: {c.id}",
                subtitle_style))
            elements.append(HRFlowable(width="100%", thickness=1,
                                       color=colors.HexColor('#e2e8f0')))
            elements.append(Spacer(1, 10))

            # Header info
            header_data = [
                ['Complaint ID', c.id, 'Status', c.status],
                ['Category', c.category or '--', 'Priority', c.priority or '--'],
                ['Channel', c.complaint_type or 'Text', 'Assigned To', c.assigned_to or '--'],
                ['Created', c.created_at.strftime('%Y-%m-%d %H:%M') if c.created_at else '--',
                 'Resolved', c.resolved_at.strftime('%Y-%m-%d %H:%M') if c.resolved_at else '--'],
            ]
            ht = Table(header_data, colWidths=[70, 150, 70, 150])
            ht.setStyle(TableStyle([
                ('FONTSIZE', (0, 0), (-1, -1), 9),
                ('FONTNAME', (0, 0), (0, -1), 'Helvetica-Bold'),
                ('FONTNAME', (2, 0), (2, -1), 'Helvetica-Bold'),
                ('TEXTCOLOR', (0, 0), (0, -1), colors.HexColor('#64748b')),
                ('TEXTCOLOR', (2, 0), (2, -1), colors.HexColor('#64748b')),
                ('TEXTCOLOR', (1, 0), (1, -1), colors.HexColor('#1e293b')),
                ('TEXTCOLOR', (3, 0), (3, -1), colors.HexColor('#1e293b')),
                ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
                ('TOPPADDING', (0, 0), (-1, -1), 6),
                ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
                ('ROWBACKGROUNDS', (0, 0), (-1, -1), [colors.HexColor('#f8fafc'), colors.white]),
                ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#e2e8f0')),
            ]))
            elements.append(ht)
            elements.append(Spacer(1, 12))

            # Title
            elements.append(Paragraph("Complaint Title", heading_style))
            elements.append(Paragraph(c.title or '--', value_style))

            # Description
            elements.append(Paragraph("Full Description", heading_style))
            elements.append(Paragraph(c.description or 'No description provided.', body_style))
            elements.append(Spacer(1, 8))

            # AI Classification
            elements.append(Paragraph("AI Classification & Analysis", heading_style))
            ai_data = [
                ['Category', c.category or '--'],
                ['Priority', c.priority or '--'],
                ['Sentiment', f"{c.sentiment_label or 'Neutral'} ({c.sentiment_score:.4f})" if c.sentiment_score else '--'],
                ['Confidence', c.confidence or '--'],
                ['Resolution Time', f"{c.resolution_time}h" if c.resolution_time else 'Pending'],
                ['SLA Deadline', c.sla_deadline.strftime('%Y-%m-%d %H:%M') if c.sla_deadline else '--'],
                ['Escalated', 'Yes' if c.escalated else 'No'],
            ]
            at = Table(ai_data, colWidths=[120, 320])
            at.setStyle(TableStyle([
                ('FONTSIZE', (0, 0), (-1, -1), 9),
                ('FONTNAME', (0, 0), (0, -1), 'Helvetica-Bold'),
                ('TEXTCOLOR', (0, 0), (0, -1), colors.HexColor('#64748b')),
                ('VALIGN', (0, 0), (-1, -1), 'TOP'),
                ('TOPPADDING', (0, 0), (-1, -1), 5),
                ('BOTTOMPADDING', (0, 0), (-1, -1), 5),
                ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#e2e8f0')),
                ('ROWBACKGROUNDS', (0, 0), (-1, -1), [colors.white, colors.HexColor('#f8fafc')]),
            ]))
            elements.append(at)
            elements.append(Spacer(1, 12))

            # Resolution
            elements.append(Paragraph("Recommended Resolution", heading_style))
            elements.append(Paragraph(f"<b>{c.resolution or 'Pending'}</b>", body_style))
            elements.append(Spacer(1, 4))
            elements.append(Paragraph(c.resolution_explanation or '', body_style))

        else:
            # ─── Full Report of ALL complaints with details ───
            complaints = Complaint.query.order_by(Complaint.created_at.desc()).all()

            elements.append(Paragraph("RESOLVO - Full Complaint Report", title_style))
            elements.append(Paragraph(
                f"Generated: {datetime.utcnow().strftime('%Y-%m-%d %H:%M UTC')} | "
                f"Total Complaints: {len(complaints)} | "
                f"Resolved: {sum(1 for c in complaints if c.status == 'Resolved')} | "
                f"Open: {sum(1 for c in complaints if c.status == 'Open')}",
                subtitle_style))
            elements.append(HRFlowable(width="100%", thickness=1,
                                       color=colors.HexColor('#e2e8f0')))

            for i, c in enumerate(complaints):
                elements.append(Spacer(1, 14))
                elements.append(Paragraph(
                    f"{c.id} - {c.title}", heading_style))

                detail_data = [
                    ['Category', c.category or '--', 'Priority', c.priority or '--',
                     'Status', c.status],
                    ['Sentiment', f"{c.sentiment_label} ({c.sentiment_score:.3f})" if c.sentiment_score is not None else '--',
                     'Confidence', c.confidence or '--',
                     'Res. Time', f"{c.resolution_time}h" if c.resolution_time else '--'],
                    ['Channel', c.complaint_type or 'Text', 'Escalated', 'Yes' if c.escalated else 'No',
                     'Assigned', c.assigned_to or '--'],
                ]

                dt = Table(detail_data, colWidths=[55, 95, 55, 80, 50, 80])
                dt.setStyle(TableStyle([
                    ('FONTSIZE', (0, 0), (-1, -1), 7),
                    ('FONTNAME', (0, 0), (0, -1), 'Helvetica-Bold'),
                    ('FONTNAME', (2, 0), (2, -1), 'Helvetica-Bold'),
                    ('FONTNAME', (4, 0), (4, -1), 'Helvetica-Bold'),
                    ('TEXTCOLOR', (0, 0), (0, -1), colors.HexColor('#64748b')),
                    ('TEXTCOLOR', (2, 0), (2, -1), colors.HexColor('#64748b')),
                    ('TEXTCOLOR', (4, 0), (4, -1), colors.HexColor('#64748b')),
                    ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#e2e8f0')),
                    ('TOPPADDING', (0, 0), (-1, -1), 3),
                    ('BOTTOMPADDING', (0, 0), (-1, -1), 3),
                    ('ROWBACKGROUNDS', (0, 0), (-1, -1), [colors.white, colors.HexColor('#f8fafc')]),
                ]))
                elements.append(dt)

                if c.description:
                    desc_text = c.description[:300] + ('...' if len(c.description) > 300 else '')
                    elements.append(Paragraph(f"<i>{desc_text}</i>", body_style))

                if c.resolution:
                    elements.append(Paragraph(
                        f"<b>Resolution:</b> {c.resolution}", body_style))

                if i < len(complaints) - 1:
                    elements.append(Spacer(1, 4))
                    elements.append(HRFlowable(width="100%", thickness=0.5,
                                               color=colors.HexColor('#e2e8f0')))

        doc.build(elements)
        buffer.seek(0)
        response = make_response(buffer.getvalue())
        response.headers['Content-Type'] = 'application/pdf'
        fname = f'complaint_{complaint_id}.pdf' if complaint_id else 'full_complaint_report.pdf'
        response.headers['Content-Disposition'] = f'attachment; filename={fname}'
        return response
    except ImportError:
        return jsonify({"error": "reportlab not installed"}), 500


# ─── Appwrite Cloud API ───────────────────────────────────────────────────────

@app.route('/api/appwrite/status', methods=['GET'])
def appwrite_status():
    ok, msg = appwrite_test_connection()
    return jsonify({'connected': ok, 'message': msg})


@app.route('/api/appwrite/complaints', methods=['GET'])
def get_appwrite_complaints():
    limit = request.args.get('limit', 50, type=int)
    docs = fetch_complaints_from_appwrite(limit=limit)
    return jsonify({'total': len(docs), 'complaints': docs})


@app.route('/api/appwrite/sync-all', methods=['POST'])
def sync_all_to_appwrite():
    complaints = Complaint.query.order_by(Complaint.created_at.desc()).limit(100).all()
    dicts = [c.to_dict() for c in complaints]
    success, failed = sync_all_complaints(dicts)
    return jsonify({'synced': success, 'failed': failed})


# ─── Agentic Mode API ────────────────────────────────────────────────────────

AGENTIC_SYSTEM_INSTRUCTION = """You are Resolvo AI, an expert customer support agent for a wellness packaged water bottle company.

The customer has described their issue via audio (transcribed below). Your job is to:
1. Understand the issue deeply
2. Generate a comprehensive, visual HTML troubleshooting guide

Return ONLY valid JSON (no markdown, no code fences):
{
  "transcript": "Clean transcription of the audio",
  "category": "Product|Packaging|Trade",
  "priority": "High|Medium|Low",
  "sentiment_score": 0.0,
  "sentiment_label": "Angry|Neutral|Happy",
  "resolution": "Short resolution action",
  "confidence": "85%",
  "html_guide": "<full standalone HTML document with inline CSS for a beautiful troubleshooting guide. Use a clean modern design with steps, icons (use unicode emoji), color-coded sections, and a professional layout. Include: 1) Issue Summary header, 2) Step-by-step resolution guide with numbered steps, 3) Visual indicators for each step, 4) Expected outcome section, 5) Contact escalation info. Make it look premium with gradients, rounded corners, and good typography using system fonts. Add a print-friendly @media print section. The HTML should be fully self-contained with all styles inline or in a <style> tag.>"
}"""


@app.route('/api/agentic/resolve', methods=['POST'])
def agentic_resolve():
    """Full agentic pipeline: audio -> transcribe -> classify -> generate HTML guide -> sync to Appwrite."""
    try:
        import json as json_module
        audio_file = request.files.get('audio')
        text_input = None

        if audio_file:
            audio_bytes = audio_file.read()
            if len(audio_bytes) < 100:
                return jsonify({"error": "Audio file too small"}), 400
            mime_type = audio_file.content_type or 'audio/webm'
            parts = [
                {"mime_type": mime_type, "data": audio_bytes},
                "Transcribe this customer audio and generate a resolution guide."
            ]
        else:
            text_input = request.form.get('text') or (request.json or {}).get('text', '')
            if not text_input:
                return jsonify({"error": "No audio or text provided"}), 400
            parts = [f"Customer complaint: {text_input}"]

        # Try models with centralized fallback chain
        contents = [{"role": "user", "parts": parts}]
        try:
            response_text, used_model = call_with_fallback(
                contents, AGENTIC_SYSTEM_INSTRUCTION, 0.2, 
                preferred_model='gemini-3.1-flash-lite',
                fallback_chain=['gemini-2.5-flash', 'gemini-1.5-pro', 'gemini-1.5-flash']
            )
            print(f"Agentic: Used model {used_model}")
        except Exception as e:
            return jsonify({"error": str(e)}), 500

        # Parse JSON response (strip markdown fences if present)
        clean = response_text.strip()
        if clean.startswith('```'):
            clean = clean.split('\n', 1)[1] if '\n' in clean else clean[3:]
        if clean.endswith('```'):
            clean = clean[:-3]
        clean = clean.strip()

        try:
            result = json_module.loads(clean)
        except json_module.JSONDecodeError:
            # Try to find JSON in the response
            import re
            json_match = re.search(r'\{[\s\S]*\}', clean)
            if json_match:
                result = json_module.loads(json_match.group())
            else:
                return jsonify({"error": "Failed to parse AI response", "raw": response_text}), 500

        # Create complaint in SQLite
        transcript = result.get('transcript', text_input or '')
        category = result.get('category', 'Product')
        priority = result.get('priority', 'Medium')
        sentiment_score = float(result.get('sentiment_score', 0))
        sentiment_label = result.get('sentiment_label', 'Neutral')

        cid = get_next_complaint_id()
        sla_hours = get_sla_hours(priority)

        if sentiment_score < -0.3:
            sicon = 'angry'
        elif sentiment_score > 0.3:
            sicon = 'happy'
        else:
            sicon = 'neutral'

        complaint = Complaint(
            id=cid,
            title=f"[Agentic] {transcript[:80]}",
            description=transcript,
            category=category,
            priority=priority,
            status='Open',
            sentiment_label=sentiment_label,
            sentiment_score=round(sentiment_score, 6),
            sentiment_icon=sicon,
            resolution=result.get('resolution', 'See HTML guide'),
            resolution_explanation=f"AI-generated troubleshooting guide provided via Agentic Mode",
            confidence=result.get('confidence', '90%'),
            sla_deadline=datetime.utcnow() + timedelta(hours=sla_hours),
            created_at=datetime.utcnow(),
            complaint_type='Audio',
            assigned_to='Resolvo AI Agent',
            escalated=priority == 'High',
            attempts=1,
        )
        db.session.add(complaint)
        db.session.commit()

        # Sync to Appwrite cloud
        try:
            sync_complaint_to_appwrite(complaint.to_dict())
            complaint.appwrite_synced = True
            db.session.commit()
        except Exception as sync_err:
            print(f"[Agentic Appwrite Sync] {sync_err}")

        return jsonify({
            'complaint': complaint.to_dict(),
            'transcript': transcript,
            'html_guide': result.get('html_guide', ''),
            'analysis': {
                'category': category,
                'priority': priority,
                'sentiment': {'label': sentiment_label, 'score': sentiment_score},
                'resolution': result.get('resolution', ''),
                'confidence': result.get('confidence', ''),
            }
        })
    except Exception as e:
        print(f"Agentic Error: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({"error": str(e)}), 500


# ─── SLA Settings API ────────────────────────────────────────────────────────

SLA_SETTINGS = {'High': 24, 'Medium': 48, 'Low': 72}


@app.route('/api/sla-settings', methods=['GET'])
def get_sla_settings():
    return jsonify(SLA_SETTINGS)


@app.route('/api/sla-settings', methods=['POST'])
def update_sla_settings():
    data = request.json
    for key in ['High', 'Medium', 'Low']:
        if key in data:
            SLA_SETTINGS[key] = int(data[key])
    return jsonify(SLA_SETTINGS)


# ─── Seed Sample Data ─────────────────────────────────────────────────────────

SAMPLE_COMPLAINTS = [
    {'id': 'CMP-001', 'text': 'Need bulk order details', 'category': 'Trade', 'priority': 'Medium', 'sentiment': -0.675170158, 'resolution_time': 60},
    {'id': 'CMP-002', 'text': 'Box was broken', 'category': 'Packaging', 'priority': 'High', 'sentiment': 0.274107138, 'resolution_time': 21},
    {'id': 'CMP-003', 'text': 'Product stopped working', 'category': 'Product', 'priority': 'Low', 'sentiment': -0.614865631, 'resolution_time': 70},
    {'id': 'CMP-004', 'text': 'Poor packaging quality', 'category': 'Packaging', 'priority': 'Medium', 'sentiment': -0.208160886, 'resolution_time': 20},
    {'id': 'CMP-005', 'text': 'Need bulk order details', 'category': 'Trade', 'priority': 'Low', 'sentiment': 0.361009618, 'resolution_time': 52},
    {'id': 'CMP-006', 'text': 'Inquiry about pricing', 'category': 'Trade', 'priority': 'High', 'sentiment': 0.695672832, 'resolution_time': 17},
    {'id': 'CMP-007', 'text': 'Damaged packaging', 'category': 'Packaging', 'priority': 'Low', 'sentiment': -0.497890919, 'resolution_time': 44},
    {'id': 'CMP-008', 'text': 'Trade-related query', 'category': 'Trade', 'priority': 'Low', 'sentiment': 0.017067097, 'resolution_time': 67},
    {'id': 'CMP-009', 'text': 'Product malfunctioning', 'category': 'Product', 'priority': 'Low', 'sentiment': -0.314755893, 'resolution_time': 71},
    {'id': 'CMP-010', 'text': 'Poor packaging quality', 'category': 'Packaging', 'priority': 'Low', 'sentiment': -0.150693881, 'resolution_time': 36},
    {'id': 'CMP-011', 'text': 'Damaged packaging', 'category': 'Packaging', 'priority': 'High', 'sentiment': 0.218160296, 'resolution_time': 25},
]


def seed_sample_data():
    if Complaint.query.count() > 0:
        return
    for item in SAMPLE_COMPLAINTS:
        resolution_data = generate_resolution(item['category'])
        sla_hours = get_sla_hours(item['priority'])
        score = item['sentiment']
        if score < -0.3: slabel, sicon = 'Angry', 'angry'
        elif score > 0.3: slabel, sicon = 'Happy', 'happy'
        else: slabel, sicon = 'Neutral', 'neutral'
        created = datetime.utcnow() - timedelta(hours=item['resolution_time'] + 5)
        complaint = Complaint(
            id=item['id'], title=item['text'], description=item['text'],
            category=item['category'], priority=item['priority'],
            status='Open' if item['resolution_time'] > 40 else 'Resolved',
            sentiment_label=slabel, sentiment_score=round(score, 6),
            sentiment_icon=sicon,
            resolution=resolution_data['action'],
            resolution_explanation=resolution_data['explanation'],
            confidence=get_confidence(item['text']),
            sla_deadline=created + timedelta(hours=sla_hours),
            created_at=created,
            resolved_at=created + timedelta(hours=item['resolution_time']) if item['resolution_time'] <= 40 else None,
            resolution_time=item['resolution_time'],
            complaint_type='Text', assigned_to='Auto Assigned',
            escalated=item['priority'] == 'High', attempts=1,
        )
        db.session.add(complaint)
    try:
        db.session.commit()
        print(f"[OK] Seeded {len(SAMPLE_COMPLAINTS)} sample complaints")
    except Exception as e:
        db.session.rollback()
        print(f"[WARN] Seed failed: {e}")


if __name__ == '__main__':
    with app.app_context():
        db.create_all()
        seed_sample_data()
    app.run(debug=True, port=5000)
