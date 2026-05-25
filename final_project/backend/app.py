import os
from flask_cors import CORS
import io
import csv
import base64
from datetime import datetime, timedelta, timezone

# Indian Standard Time (UTC+5:30)
IST = timezone(timedelta(hours=5, minutes=30))

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
CORS(app, resources={r"/api/*": {"origins": [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:3000",
    "http://127.0.0.1:3000"
]}})

login_manager = LoginManager()
login_manager.login_view = 'login'
login_manager.init_app(app)

# Client will be created dynamically per-request to support multiple keys

APPWRITE_CFG = {
    'endpoint': os.getenv('APPWRITE_ENDPOINT', ''),
    'project_id': os.getenv('APPWRITE_PROJECT_ID', ''),
    'db_id': os.getenv('APPWRITE_DB_ID', ''),
    'col_id': os.getenv('APPWRITE_COL_ID', ''),
}


@login_manager.user_loader
def load_user(user_id):
    return User.query.get(int(user_id))


# ─── Appwrite JWT Auth Middleware ─────────────────────────────────────────────

def verify_appwrite_jwt(token):
    """
    Verify an Appwrite JWT token by calling the Appwrite API.
    Returns (user_dict, None) on success, (None, error_msg) on failure.
    The token is passed from the frontend Authorization: Bearer <token> header.
    """
    try:
        import requests as req_lib
        endpoint = APPWRITE_CFG['endpoint']
        project_id = APPWRITE_CFG['project_id']
        if not endpoint or not project_id:
            return None, 'Appwrite not configured'
        # Use Appwrite's /account endpoint to verify the session JWT
        resp = req_lib.get(
            f"{endpoint}/account",
            headers={
                'X-Appwrite-Project': project_id,
                'Authorization': f'Bearer {token}',
                'Content-Type': 'application/json',
            },
            timeout=5
        )
        if resp.status_code == 200:
            return resp.json(), None
        return None, f'Invalid token (status {resp.status_code})'
    except Exception as e:
        return None, str(e)


def get_request_jwt():
    """Extract JWT from Authorization header."""
    auth_header = request.headers.get('Authorization', '')
    if auth_header.startswith('Bearer '):
        return auth_header[7:]
    return None


def require_role(*allowed_roles):
    """
    Decorator factory that verifies the caller's Appwrite JWT and
    checks that their stored prefs.role is in allowed_roles.
    Applies ONLY to API routes called from the frontend.
    If no JWT is provided, the route proceeds (for backwards compat with
    unauthenticated complaint submission — add jwt=True to enforce).
    """
    def decorator(f):
        from functools import wraps
        @wraps(f)
        def wrapped(*args, **kwargs):
            token = get_request_jwt()
            if not token:
                # Allow anonymous access to read-only routes; block writes
                return f(*args, **kwargs)
            user_data, err = verify_appwrite_jwt(token)
            if err:
                return jsonify({'error': 'Unauthorized', 'detail': err}), 401
            prefs = user_data.get('prefs', {})
            user_role = prefs.get('role', '')
            if allowed_roles and user_role not in allowed_roles:
                return jsonify({
                    'error': 'Forbidden',
                    'detail': f'Role "{user_role}" is not allowed. Required: {list(allowed_roles)}'
                }), 403
            # Attach user info to request context for downstream use
            request.appwrite_user = user_data
            return f(*args, **kwargs)
        return wrapped
    return decorator


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
            
    if keys_to_try:
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
                    if 'api' in err_str or 'key' in err_str or 'quota' in err_str or '429' in err_str or '400' in err_str:
                        continue
                    break
    else:
        print("[AI] No API keys found. Skipping Gemini models.")

    # Final Fallback: Local Ollama (if available)
    try:
        import requests as requests_lib
        print(f"[OLLAMA] Attempting local fallback...")
        # Try tiny model first for speed
        for local_mdl in ['tinydolphin', 'gemma:2b', 'gemma']:
            ollama_payload = {
                "model": local_mdl,
                "prompt": f"{system_instruction}\n\nInput: {contents}",
                "stream": False
            }
            try:
                resp = requests_lib.post("http://localhost:11434/api/generate", json=ollama_payload, timeout=15)
                if resp.status_code == 200:
                    print(f"[SUCCESS] Ollama local fallback ({local_mdl}) succeeded")
                    return resp.json().get('response', ''), f'ollama-{local_mdl}'
            except:
                continue
    except Exception as ollama_err:
        print(f"[FAILED] Ollama fallback failed: {ollama_err}")

    # EMERGENCY: Rule-Based Pseudo-AI
    import random
    print("[MOCK] Using Intelligent Pseudo-AI Fallback.")
    
    RULES = {
        'leak': "I'm sorry to hear about the leak. Please check the batch number on the neck of the bottle so we can verify if this is a known seal issue. We will initiate a replacement.",
        'taste': "Unusual taste is a priority. Please stop using the product immediately. We'll need the production date from the cap to trace the batch quality.",
        'broken': "Damaged goods are unacceptable. I've logged a request for a fresh delivery. Could you confirm if the outer carton was also damaged?",
        'price': "Our pricing varies by region. I've noted your inquiry for our trade manager who will provide the latest wholesale rate sheet.",
        'batch': "Batch tracking is active. I've linked your report to our quality control logs for further investigation.",
        'packaging': "We are continuously improving our packaging durability. Your feedback has been sent to the design team for batch review."
    }
    
    input_text = str(contents).lower()
    reply = "I've analyzed your report. Our quality team is reviewing the batch data and we will update your case status shortly."
    
    for key, val in RULES.items():
        if key in input_text:
            reply = val
            break
            
    mock_response = {
        "reply": reply,
        "category": "Product" if 'taste' in input_text or 'leak' in input_text else "Packaging",
        "mood": -0.2 if 'angry' in input_text or 'human' in input_text else 0.0,
        "priority": "High" if 'taste' in input_text or 'human' in input_text else "Medium",
        "should_escalate": 'human' in input_text or 'agent' in input_text,
        "is_resolved": 'thank' in input_text or 'satisfied' in input_text
    }
    
    import json as json_module
    return json_module.dumps(mock_response), 'pseudo-ai-mock'


# ─── AI Chat API ──────────────────────────────────────────────────────────────

SYSTEM_INSTRUCTION = """You are a helpful customer support AI for a wellness packaged water bottle company.
Assess the user's text (and any uploaded visual context) to resolve their issue. Change mood based on their cooperativeness on a scale from 1.0 to -1.0. Citing specific methods for resolution is mandatory.

ESCALATION LOGIC:
If the user explicitly asks for a human, expresses repeated frustration, or says you are not helping multiple times, set "should_escalate" to true.
If you believe the issue is resolved and the customer seems satisfied, set "is_resolved" to true.

CRITICAL: Return strictly valid JSON only. No markdown.
{
  "reply": "Your conversational reply",
  "category": "Product|Packaging|Trade|Unknown",
  "mood": 0.0,
  "priority": "High|Medium|Low",
  "should_escalate": false,
  "is_resolved": false
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
        
        # Validation: Ensure digits are valid
        import re
        if not re.match(r'^[0-9*#]+$', digits):
            return jsonify({"error": "Invalid characters in dial sequence"}), 400

        system_instruction = """You are an automated IVR system for Resolvo packaged water bottles.
The customer has dialed the following digits on their phone keypad. Based on the sequence, respond concisely with an automated voice menu or simulated action (e.g. 'You entered 1 for packaging. Please state your issue.'). Keep it brief and robotic but helpful."""
        
        prompt = f"The user dialed: {digits}. What is the system's voice response?"
        
        text, used = call_with_fallback(prompt, system_instruction, 0.2, 'gemma-4-31b-it')
        return jsonify({"reply": text, "model_used": used})
    except Exception as e:
        print("Phone Sim Error:", e)
        return jsonify({"error": str(e)}), 500


# ─── Email AI Drafting API ──────────────────────────────────────────────────

@app.route('/api/ai/draft-email', methods=['POST'])
def api_draft_email():
    try:
        data = request.json
        subject = data.get('subject', '')
        body = data.get('body', '')
        
        system_instruction = "You are a customer support AI. Draft a professional, empathetic response to the customer's email content."
        prompt = f"Subject: {subject}\nCustomer Body: {body}"
        
        text, used = call_with_fallback(prompt, system_instruction, 0.3, 'gemma-4-31b-it')
        return jsonify({"draft": text, "model_used": used})
    except Exception as e:
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

def get_robust_json(text):
    """Robustly extract and parse JSON from AI response text."""
    try:
        import json as json_module
        import re
        # Clean markdown fences
        clean = text.strip()
        if clean.startswith('```'):
            clean = clean.split('\n', 1)[1] if '\n' in clean else clean[3:]
        if clean.endswith('```'):
            clean = clean[:-3]
        clean = clean.strip()
        
        # Try finding the first '{' and last '}'
        match = re.search(r'\{[\s\S]*\}', clean)
        if match:
            return json_module.loads(match.group())
        return json_module.loads(clean)
    except Exception as e:
        print(f"JSON Parse Error: {e}")
        return None

def process_complaint_data(data):
    content = data.get('description') or data.get('emailBody') or ''
    sentiment = analyze_sentiment(content)
    category = data.get('category') or classify_complaint(content)
    priority = data.get('priority') or determine_priority(content, sentiment)
    resolution_data = generate_resolution(category)
    confidence = get_confidence(content)
    sla_hours = get_sla_hours(priority)
    ctype = data.get('type', 'Text')

    if ctype == 'Email':
        title = data.get('title') or f"Email: {data.get('emailSubject', 'Untitled')}"
    elif ctype == 'Call':
        title = data.get('title') or f"Call from {data.get('phoneNumber', 'Unknown')}"
    elif ctype == 'Audio':
        title = data.get('title') or "Live Audio Complaint"
    else:
        title = data.get('title') or 'Text Complaint'

    complaint = Complaint(
        title=title, description=content,
        category=category, priority=priority, status='Open',
        sentiment_label=sentiment['label'], sentiment_score=sentiment['score'],
        sentiment_icon=sentiment['icon'],
        resolution=resolution_data['action'],
        resolution_explanation=resolution_data['explanation'],
        confidence=confidence,
        sla_deadline=datetime.now(IST) + timedelta(hours=sla_hours),
        created_at=datetime.now(IST),
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
        # Strictly ensure custom_id is set
        complaint.custom_id = f"CMP-{complaint.id:04d}"
        db.session.commit()
        
        # Sync to Appwrite
        try:
            sync_complaint_to_appwrite(complaint.to_dict(), image_base64=data.get('attachment'))
            complaint.appwrite_synced = True
            db.session.commit()
        except Exception as sync_err:
            print(f"[Appwrite Sync] {sync_err}")
            
        return jsonify(complaint.to_dict()), 201
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": str(e)}), 500


def find_complaint(cid):
    """Helper to find complaint by internal ID or custom_id."""
    if str(cid).startswith('CMP-'):
        return Complaint.query.filter_by(custom_id=cid).first()
    try:
        # Try as internal primary key
        return Complaint.query.get(int(cid))
    except:
        # Fallback to custom_id search if int conversion fails
        return Complaint.query.filter_by(custom_id=cid).first()

@app.route('/api/complaints/<complaint_id>', methods=['PATCH'])
def update_complaint(complaint_id):
    complaint = find_complaint(complaint_id)
    if not complaint:
        return jsonify({"error": "Not found"}), 404
    updates = request.json
    for key, value in updates.items():
        if key == 'status':
            complaint.status = value
            if value == 'Resolved':
                complaint.resolved_at = datetime.now(IST)
                if complaint.created_at:
                    # Ensure both are aware for subtraction
                    created = complaint.created_at
                    if created.tzinfo is None:
                        created = created.replace(tzinfo=timezone.utc)
                    
                    now_aware = datetime.now(IST)
                    delta = now_aware - created
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
        update_complaint_status_appwrite(complaint.custom_id or complaint.id, complaint.status, complaint.resolution_time)
    except Exception as e:
        print(f"Appwrite status sync error: {e}")

    return jsonify(complaint.to_dict())


@app.route('/api/complaints/<complaint_id>', methods=['GET'])
def get_complaint(complaint_id):
    complaint = find_complaint(complaint_id)
    if not complaint:
        return jsonify({"error": "Not found"}), 404
    return jsonify(complaint.to_dict())

@app.route('/api/complaints/<complaint_id>', methods=['DELETE'])
def delete_complaint(complaint_id):
    complaint = find_complaint(complaint_id)
    if not complaint:
        return jsonify({"error": "Not found"}), 404
    
    # Capture ID before deletion
    target_id = complaint.custom_id or str(complaint.id)
    
    db.session.delete(complaint)
    db.session.commit()
    
    # Cascade deletion to Appwrite
    try:
        from appwrite_sync import delete_complaint_from_appwrite
        delete_complaint_from_appwrite(target_id)
    except Exception as e:
        print(f"Appwrite delete error: {e}")
        
    return jsonify({"success": True})


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

    now = datetime.now(IST)
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
            c = Complaint.query.filter_by(custom_id=complaint_id).first()
            if not c:
                try: c = Complaint.query.get(int(complaint_id))
                except: c = None
            
            if not c:
                return jsonify({"error": "Complaint not found"}), 404

            elements.append(Paragraph("RESOLVO - Complaint Detail Report", title_style))
            elements.append(Paragraph(
                f"Generated: {datetime.now(IST).strftime('%Y-%m-%d %H:%M IST')} | Complaint: {c.custom_id or c.id}",
                subtitle_style))
            elements.append(HRFlowable(width="100%", thickness=1,
                                       color=colors.HexColor('#e2e8f0')))
            elements.append(Spacer(1, 10))

            # Header info
            header_data = [
                ['Complaint ID', c.custom_id or str(c.id), 'Status', c.status],
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
            # ... Full Report logic remains same ...
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

            elements.append(Paragraph("RESOLVO - Full Complaint Report", title_style))
            elements.append(Paragraph(
                f"Generated: {datetime.now(IST).strftime('%Y-%m-%d %H:%M IST')} | "
                f"Total Complaints: {len(complaints)} | "
                f"Resolved: {sum(1 for c in complaints if c.status == 'Resolved')} | "
                f"Open: {sum(1 for c in complaints if c.status == 'Open')}",
                subtitle_style))
            elements.append(HRFlowable(width="100%", thickness=1,
                                       color=colors.HexColor('#e2e8f0')))

            for i, c in enumerate(complaints):
                elements.append(Spacer(1, 14))
                elements.append(Paragraph(
                    f"{c.custom_id or c.id} - {c.title}", heading_style))

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
    except Exception as e:
        print(f"PDF Error: {e}")
        return jsonify({"error": str(e)}), 500


# ─── Appwrite Cloud API ───────────────────────────────────────────────────────

@app.route('/api/appwrite/status', methods=['GET'])
def appwrite_status():
    ok, msg = appwrite_test_connection()
    return jsonify({'connected': ok, 'message': msg})


@app.route('/api/appwrite/complaints', methods=['GET'])
def get_appwrite_complaints():
    """Fetch all complaints from local DB as source of truth, merging cloud data for images/metadata."""
    try:
        limit = request.args.get('limit', 200, type=int)
        
        # 1. Fetch from local DB (Primary Truth)
        local_complaints = Complaint.query.order_by(Complaint.created_at.desc()).limit(limit).all()
        local_list = [c.to_dict() for c in local_complaints]
        local_ids = {c['id'] for c in local_list}

        # 2. Fetch from Appwrite to get things like image_urls or cloud-only data
        try:
            import re
            id_pattern = re.compile(r'^CMP-\d{4}$')
            
            cloud_docs = fetch_complaints_from_appwrite(limit=limit)
            # FILTER: Only include docs with standard IDs
            cloud_docs = [d for d in cloud_docs if id_pattern.match(str(d.get('complaint_id', '')))]
            
            cloud_map = {doc.get('complaint_id'): doc for doc in cloud_docs if doc.get('complaint_id')}
            
            # Merge cloud data into local records
            for c in local_list:
                cid = c['id']
                if cid in cloud_map:
                    doc = cloud_map[cid]
                    # Update local record with cloud-only fields
                    if doc.get('image_url'): c['image_url'] = doc['image_url']
                    if doc.get('$createdAt'): c['cloudCreatedAt'] = doc['$createdAt']
            
            # Identify cloud-only complaints (if any exist from other devices)
            for cid, doc in cloud_map.items():
                if cid not in local_ids:
                    # Convert cloud doc to app format
                    local_list.append({
                        'id': cid,
                        'title': doc.get('text', 'Cloud Complaint')[:50],
                        'description': doc.get('text', ''),
                        'category': doc.get('category', 'Product'),
                        'priority': doc.get('priority', 'Medium'),
                        'status': doc.get('status', 'Open'),
                        'sentiment': {'score': doc.get('sentiment', 0), 'label': 'Neutral', 'icon': '😐'},
                        'createdAt': doc.get('$createdAt'),
                        'image_url': doc.get('image_url')
                    })
        except Exception as cloud_err:
            print(f"Cloud fetch warning: {cloud_err}")

        # 3. Final sort
        def get_date(x):
            return x.get('createdAt') or x.get('$createdAt') or '0'
        local_list.sort(key=get_date, reverse=True)

        return jsonify({'total': len(local_list), 'complaints': local_list[:limit]})
    except Exception as e:
        print(f"Error fetching complaints: {e}")
        return jsonify({"error": str(e)}), 500


@app.route('/api/appwrite/sync-all', methods=['POST'])
def sync_all_to_appwrite():
    """Bulk-sync all unsynced complaints to Appwrite."""
    try:
        unsynced = Complaint.query.filter_by(appwrite_synced=False).all()
        success = 0
        failed = 0
        
        for c in unsynced:
            appwrite_id = sync_complaint_to_appwrite(c.to_dict())
            if appwrite_id:
                c.appwrite_synced = True
                success += 1
            else:
                failed += 1
        
        db.session.commit()
        return jsonify({'synced': success, 'failed': failed})
    except Exception as e:
        print(f"Sync-all failed: {e}")
        return jsonify({"error": str(e)}), 500


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

        # Parse JSON response using robust parser
        result = get_robust_json(response_text)
        if not result:
            return jsonify({"error": "Failed to parse AI response", "raw": response_text}), 500

        # Create complaint in SQLite
        transcript = result.get('transcript', text_input or '')
        category = result.get('category', 'Product')
        priority = result.get('priority', 'Medium')
        sentiment_score = float(result.get('sentiment_score', 0))
        sentiment_label = result.get('sentiment_label', 'Neutral')

        sla_hours = get_sla_hours(priority)

        if sentiment_score < -0.3:
            sicon = 'angry'
        elif sentiment_score > 0.3:
            sicon = 'happy'
        else:
            sicon = 'neutral'

        complaint = Complaint(
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
            sla_deadline=datetime.now(IST) + timedelta(hours=sla_hours),
            created_at=datetime.now(IST),
            complaint_type='Audio',
            assigned_to='Resolvo AI Agent',
            escalated=priority == 'High',
            attempts=1,
        )
        db.session.add(complaint)
        db.session.commit()
        
        complaint.custom_id = f"CMP-{complaint.id:04d}"
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
    {'id': 'CMP-0001', 'text': 'Need bulk order details', 'category': 'Trade', 'priority': 'Medium', 'sentiment': -0.675170158, 'resolution_time': 60},
    {'id': 'CMP-0002', 'text': 'Box was broken', 'category': 'Packaging', 'priority': 'High', 'sentiment': 0.274107138, 'resolution_time': 21},
    {'id': 'CMP-0003', 'text': 'Product stopped working', 'category': 'Product', 'priority': 'Low', 'sentiment': -0.614865631, 'resolution_time': 70},
    {'id': 'CMP-0004', 'text': 'Poor packaging quality', 'category': 'Packaging', 'priority': 'Medium', 'sentiment': -0.208160886, 'resolution_time': 20},
    {'id': 'CMP-0005', 'text': 'Need bulk order details', 'category': 'Trade', 'priority': 'Low', 'sentiment': 0.361009618, 'resolution_time': 52},
    {'id': 'CMP-0006', 'text': 'Inquiry about pricing', 'category': 'Trade', 'priority': 'High', 'sentiment': 0.695672832, 'resolution_time': 17},
    {'id': 'CMP-0007', 'text': 'Damaged packaging', 'category': 'Packaging', 'priority': 'Low', 'sentiment': -0.497890919, 'resolution_time': 44},
    {'id': 'CMP-0008', 'text': 'Trade-related query', 'category': 'Trade', 'priority': 'Low', 'sentiment': 0.017067097, 'resolution_time': 67},
    {'id': 'CMP-0009', 'text': 'Product malfunctioning', 'category': 'Product', 'priority': 'Low', 'sentiment': -0.314755893, 'resolution_time': 71},
    {'id': 'CMP-0010', 'text': 'Poor packaging quality', 'category': 'Packaging', 'priority': 'Low', 'sentiment': -0.150693881, 'resolution_time': 36},
    {'id': 'CMP-0011', 'text': 'Damaged packaging', 'category': 'Packaging', 'priority': 'High', 'sentiment': 0.218160296, 'resolution_time': 25},
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
        created = datetime.now(IST) - timedelta(hours=item['resolution_time'] + 5)
        complaint = Complaint(
            custom_id=item['id'], title=item['text'], description=item['text'],
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


import threading
import time

def background_sla_monitor():
    """Proactively monitor SLAs and auto-escalate breached complaints."""
    with app.app_context():
        while True:
            try:
                now = datetime.now(IST)
                breached = Complaint.query.filter(
                    Complaint.status.notin_(['Resolved', 'Escalated']),
                    Complaint.sla_deadline < now
                ).all()
                for c in breached:
                    c.status = 'Escalated'
                    c.escalated = True
                    c.resolution_explanation = (c.resolution_explanation or '') + "\n[SYSTEM]: Auto-escalated due to SLA breach."
                    db.session.commit()
                    from appwrite_sync import update_complaint_status_appwrite
                    update_complaint_status_appwrite(c.id, c.status)
                    print(f"[SLA Monitor] Auto-escalated {c.id}")
            except Exception as e:
                print(f"[SLA Monitor] Error: {e}")
            time.sleep(60) # Check every minute


# ─── Auth API Endpoints ───────────────────────────────────────────────────────

@app.route('/api/auth/me', methods=['GET'])
def auth_me():
    """
    Validate an Appwrite JWT and return the user's profile + role.
    The frontend passes Authorization: Bearer <session-jwt> header.
    """
    token = get_request_jwt()
    if not token:
        return jsonify({'error': 'No token provided'}), 401
    user_data, err = verify_appwrite_jwt(token)
    if err:
        return jsonify({'error': 'Unauthorized', 'detail': err}), 401
    prefs = user_data.get('prefs', {})
    return jsonify({
        'id': user_data.get('$id'),
        'name': user_data.get('name'),
        'email': user_data.get('email'),
        'role': prefs.get('role', ''),
        'employee_id': prefs.get('employee_id', ''),
        'role_locked': prefs.get('role_locked', False),
        'email_verification': user_data.get('emailVerification', False),
    })


@app.route('/api/auth/validate-role', methods=['POST'])
def auth_validate_role():
    """
    Validate that a JWT user's stored role matches the claimed role.
    Body: { "claimed_role": "Quality Assurance Team" }
    Returns 200 OK or 403 FORBIDDEN.
    """
    token = get_request_jwt()
    if not token:
        return jsonify({'error': 'No token provided'}), 401
    user_data, err = verify_appwrite_jwt(token)
    if err:
        return jsonify({'error': 'Unauthorized', 'detail': err}), 401
    prefs = user_data.get('prefs', {})
    stored_role = prefs.get('role', '')
    claimed_role = (request.json or {}).get('claimed_role', '')
    if not claimed_role:
        return jsonify({'error': 'claimed_role is required'}), 400
    if stored_role != claimed_role:
        return jsonify({
            'valid': False,
            'stored_role': stored_role,
            'message': f'Role mismatch. Account is registered as "{stored_role}".',
        }), 403
    return jsonify({
        'valid': True,
        'role': stored_role,
        'user': {
            'id': user_data.get('$id'),
            'name': user_data.get('name'),
            'email': user_data.get('email'),
        }
    })


if __name__ == '__main__':
    with app.app_context():
        db.create_all()
        seed_sample_data()

        # Ensure Appwrite environment is ready
        try:
            ensure_bucket_exists()
            print("[Appwrite] Storage bucket verified/created.")
        except Exception as e:
            print(f"[Appwrite] Bucket init skipped/failed: {e}")

    # Start the proactive SLA monitor (single instance)
    threading.Thread(target=background_sla_monitor, daemon=True).start()

    app.run(debug=True, port=5000)
