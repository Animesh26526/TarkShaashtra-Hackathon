from flask_sqlalchemy import SQLAlchemy
from flask_login import UserMixin
from datetime import datetime

db = SQLAlchemy()


class User(db.Model, UserMixin):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    email = db.Column(db.String(120), unique=True, nullable=False)
    officer_category = db.Column(db.String(100), nullable=True)
    employee_id = db.Column(db.String(50), unique=True, nullable=True)
    password = db.Column(db.String(200), nullable=True)
    google_id = db.Column(db.String(100), unique=True, nullable=True)
    role = db.Column(db.String(50), default='Customer Support Executive')
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    complaints = db.relationship('Complaint', backref='user', lazy=True)

    def __repr__(self):
        return f'<User {self.email}>'


class Complaint(db.Model):
    id = db.Column(db.String(20), primary_key=True)
    title = db.Column(db.String(200), nullable=False)
    description = db.Column(db.Text, nullable=True)
    category = db.Column(db.String(50), nullable=True)         # Product / Packaging / Trade
    priority = db.Column(db.String(20), nullable=True)          # High / Medium / Low
    status = db.Column(db.String(20), default='Open')           # Open / In Progress / Resolved / Escalated
    sentiment_label = db.Column(db.String(20), nullable=True)   # Angry / Neutral / Happy
    sentiment_score = db.Column(db.Float, default=0.0)          # -1.0 to 1.0 (matches sample data)
    sentiment_icon = db.Column(db.String(10), default='😐')
    resolution = db.Column(db.String(200), nullable=True)
    resolution_explanation = db.Column(db.Text, nullable=True)
    confidence = db.Column(db.String(10), nullable=True)
    sla_deadline = db.Column(db.DateTime, nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    resolved_at = db.Column(db.DateTime, nullable=True)
    resolution_time = db.Column(db.Integer, nullable=True)      # Hours to resolve (from sample data)
    complaint_type = db.Column(db.String(20), default='Text')   # Text / Email / Call / Audio
    phone_number = db.Column(db.String(20), nullable=True)
    email_subject = db.Column(db.String(200), nullable=True)
    assigned_to = db.Column(db.String(100), default='Auto Assigned')
    escalated = db.Column(db.Boolean, default=False)
    attempts = db.Column(db.Integer, default=1)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=True)
    appwrite_synced = db.Column(db.Boolean, default=False)

    def to_dict(self):
        return {
            'id': self.id,
            'title': self.title,
            'description': self.description,
            'category': self.category,
            'priority': self.priority,
            'status': self.status,
            'sentiment': {
                'label': self.sentiment_label or 'Neutral',
                'score': self.sentiment_score if self.sentiment_score is not None else 0.0,
                'icon': self.sentiment_icon or '😐'
            },
            'resolution': self.resolution,
            'resolutionExplanation': self.resolution_explanation,
            'confidence': self.confidence,
            'slaDeadline': self.sla_deadline.isoformat() if self.sla_deadline else None,
            'createdAt': self.created_at.isoformat() if self.created_at else None,
            'resolvedAt': self.resolved_at.isoformat() if self.resolved_at else None,
            'resolutionTime': self.resolution_time,
            'type': self.complaint_type,
            'phoneNumber': self.phone_number,
            'emailSubject': self.email_subject,
            'assignedTo': self.assigned_to,
            'escalated': self.escalated,
            'attempts': self.attempts,
        }

    def __repr__(self):
        return f'<Complaint {self.id}>'
