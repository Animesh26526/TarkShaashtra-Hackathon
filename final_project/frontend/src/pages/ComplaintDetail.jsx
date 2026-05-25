import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { 
  ArrowLeft, 
  Clock, 
  CheckCircle2, 
  AlertCircle, 
  Calendar,
  User,
  MessageCircle,
  FileDown,
  History,
  ShieldCheck,
  Trash
} from 'lucide-react';
import { useApp } from '../context/AppContext';

const ComplaintDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { complaints, updateComplaintStatus, deleteComplaint } = useApp();
  const complaint = complaints.find(c => c.id === id);

  const [timeLeft, setTimeLeft] = useState('');

  useEffect(() => {
    if (!complaint || complaint.status === 'Resolved') {
      setTimeLeft('--');
      return;
    }

    const calculateTime = () => {
      const deadline = new Date(complaint.slaDeadline);
      const now = new Date();
      
      if (isNaN(deadline.getTime())) {
        setTimeLeft('N/A');
        return;
      }

      const diff = deadline - now;

      if (diff <= 0) {
        setTimeLeft('OVERDUE');
        return;
      }

      const h = Math.floor(diff / (1000 * 60 * 60));
      const m = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      setTimeLeft(`${h}h ${m}m`);
    };

    calculateTime();
    const timer = setInterval(calculateTime, 60000);
    return () => clearInterval(timer);
  }, [complaint]);

  const handleDelete = async () => {
    if (window.confirm('Are you sure you want to permanently delete this complaint?')) {
      try {
        await deleteComplaint(complaint.id);
        navigate('/complaints');
      } catch (e) {
        alert('Failed to delete complaint');
      }
    }
  };

  const handleResolve = async () => {
    try {
      await updateComplaintStatus(complaint.id, 'Resolved');
      navigate('/complaints');
    } catch (e) {
      alert('Failed to resolve complaint');
    }
  };

  if (!complaint) return (
    <div style={{ padding: '4rem', textAlign: 'center', background: '#f8fafc', minHeight: '60vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
      <AlertCircle size={64} color="#ef4444" style={{ marginBottom: '1.5rem' }} />
      <h2 style={{ fontSize: '2rem', fontWeight: 700, marginBottom: '0.5rem' }}>Complaint Not Found</h2>
      <p style={{ color: '#64748b', marginBottom: '2rem', maxWidth: '400px' }}>
        This complaint might have been deleted, resolved, or the tracking ID is incorrect.
      </p>
      <button onClick={() => navigate('/complaints')} className="btn btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        <ArrowLeft size={18} />
        <span>Back to Complaints</span>
      </button>
    </div>
  );

  return (
    <div className="detail-page">
      <div className="detail-header">
        <div className="header-left">
          <button onClick={() => navigate(-1)} className="back-btn">
            <ArrowLeft size={18} />
          </button>
          <div className="title-group">
            <div className="id-badge">{complaint.id}</div>
            <h1>{complaint.title}</h1>
          </div>
        </div>
        <div className="header-actions">
          <button className="btn btn-outline" style={{color: '#dc2626', borderColor: '#dc2626'}} onClick={handleDelete}>
            <Trash size={18} />
            <span>Delete</span>
          </button>
          <button className="btn btn-outline" onClick={() => window.open(`/api/export/pdf/${complaint.id}`)}>
            <FileDown size={18} />
            <span>Export PDF</span>
          </button>
          {complaint.status !== 'Resolved' && (
            <button 
              className="btn btn-primary" 
              onClick={handleResolve}
            >
              <CheckCircle2 size={18} />
              <span>Mark Resolved</span>
            </button>
          )}
        </div>
      </div>

      <div className="detail-grid">
        <div className="detail-main">
          <div className="card content-card">
            <div className="section-header">
              <MessageCircle size={20} color="var(--primary)" />
              <h3>Complaint Description</h3>
            </div>
            <p className="description-text">{complaint.description}</p>
            
            <div className="meta-info">
              <div className="meta-item">
                <Calendar size={16} />
                <span>Submitted on {new Date(complaint.createdAt).toLocaleString()}</span>
              </div>
              <div className="meta-item">
                <User size={16} />
                <span>Assigned to {complaint.assignedTo}</span>
              </div>
            </div>
          </div>

          <div className="card ai-card">
            <div className="section-header">
              <ShieldCheck size={20} color="var(--primary)" />
              <h3><span className="brand-black">Resolvo</span> Recommendation</h3>
              <span className="confidence-badge">Confidence Assessment: {complaint.confidence}</span>
            </div>
            <div className="resolution-content">
              <h4>{complaint.resolution}</h4>
              <p>{complaint.resolutionExplanation || "Automated check based on category and sentiment."}</p>
            </div>
          </div>

          <div className="card timeline-card">
            <div className="section-header">
              <History size={20} color="var(--primary)" />
              <h3>Activity Timeline</h3>
            </div>
            <div className="timeline">
              <div className="timeline-item active">
                <div className="timeline-marker"></div>
                <div className="timeline-content">
                  <p className="timeline-title">Submitted Successfully</p>
                  <p className="timeline-time">{new Date(complaint.createdAt).toLocaleString()}</p>
                </div>
              </div>
              <div className="timeline-item active">
                <div className="timeline-marker"></div>
                <div className="timeline-content">
                  <p className="timeline-title">Auto Classification: {complaint.category}</p>
                  <p className="timeline-time">{new Date(complaint.createdAt).toLocaleString()}</p>
                </div>
              </div>
              {complaint.status === 'Resolved' && (
                <div className="timeline-item resolved">
                  <div className="timeline-marker"></div>
                  <div className="timeline-content">
                    <p className="timeline-title">Marked as Resolved</p>
                    <p className="timeline-time">{new Date().toLocaleString()}</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="detail-sidebar">
          <div className="card sla-card">
            <h3>SLA Tracking</h3>
            <div className={`sla-timer ${timeLeft === 'OVERDUE' && complaint.status !== 'Resolved' ? 'overdue' : ''}`}>
              <Clock size={32} />
              <div>
                <p className="timer-val">{complaint.status === 'Resolved' ? '--' : timeLeft}</p>
                <p className="timer-label">{complaint.status === 'Resolved' ? 'Resolved' : 'Time Remaining'}</p>
              </div>
            </div>
            <div className="sla-details">
              <div className="sla-row">
                <span>Priority</span>
                <span className={`badge ${complaint.priority === 'High' ? 'badge-danger' : 'badge-warning'}`}>{complaint.priority}</span>
              </div>
              <div className="sla-row">
                <span>Deadline Date</span>
                <span style={{ fontWeight: 600 }}>{new Date(complaint.slaDeadline).toLocaleDateString()}</span>
              </div>
              <div className="sla-row">
                <span>Deadline Time</span>
                <span>{new Date(complaint.slaDeadline).toLocaleTimeString()}</span>
              </div>
            </div>
          </div>

          <div className="card insight-card">
            <h3>Operational Insights</h3>
            <div className="insight-item">
              <p className="insight-label">Detected Sentiment</p>
              <div className="sentiment-display">
                <span className="emoji">{complaint.sentiment.icon}</span>
                <span className="label">{complaint.sentiment.label}</span>
                <div className="sentiment-bar">
                  <div className="fill" style={{ 
                    width: `${complaint.sentiment.score}%`,
                    background: complaint.sentiment.score < 40 ? '#ef4444' : (complaint.sentiment.score > 70 ? '#22c55e' : '#f59e0b')
                  }}></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        .detail-page { max-width: 1200px; margin: 0 auto; }
        .detail-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 2rem; }
        .header-left { display: flex; align-items: center; gap: 1.5rem; }
        .back-btn { width: 40px; height: 40px; border-radius: 50%; border: 1px solid var(--border); background: white; display: flex; align-items: center; justify-content: center; color: var(--text-muted); transition: all 0.2s; }
        .back-btn:hover { background: #f1f5f9; color: var(--primary); }
        .title-group h1 { font-size: 1.5rem; font-weight: 700; }
        .id-badge { font-size: 0.75rem; font-weight: 700; color: var(--primary); background: var(--primary-light); padding: 0.25rem 0.5rem; border-radius: 4px; display: inline-block; margin-bottom: 0.5rem; }
        .header-actions { display: flex; gap: 1rem; }
        .detail-grid { display: grid; grid-template-columns: 1fr 340px; gap: 1.5rem; }
        .detail-main { display: flex; flex-direction: column; gap: 1.5rem; }
        .section-header { display: flex; align-items: center; gap: 0.75rem; margin-bottom: 1.5rem; position: relative; }
        .section-header h3 { font-size: 1.125rem; font-weight: 600; }
        .confidence-badge { position: absolute; right: 0; font-size: 0.75rem; background: #ecfdf5; color: #065f46; padding: 0.25rem 0.625rem; border-radius: 9999px; font-weight: 600; }
        .description-text { font-size: 1rem; line-height: 1.6; color: var(--text-main); margin-bottom: 2rem; }
        .meta-info { display: flex; gap: 2rem; padding-top: 1.5rem; border-top: 1px solid var(--border); }
        .meta-item { display: flex; align-items: center; gap: 0.5rem; font-size: 0.875rem; color: var(--text-muted); }
        .resolution-content h4 { font-size: 1.25rem; font-weight: 700; color: var(--primary); margin-bottom: 0.75rem; }
        .resolution-content p { color: var(--text-muted); line-height: 1.6; }
        .timeline { position: relative; padding-left: 2rem; }
        .timeline::before { content: ''; position: absolute; left: 7px; top: 0; bottom: 0; width: 2px; background: var(--border); }
        .timeline-item { position: relative; padding-bottom: 2rem; }
        .timeline-marker { position: absolute; left: -2rem; width: 16px; height: 16px; border-radius: 50%; background: white; border: 2px solid var(--border); z-index: 1; }
        .timeline-item.active .timeline-marker { border-color: var(--primary); background: var(--primary); }
        .timeline-item.resolved .timeline-marker { border-color: var(--success); background: var(--success); }
        .timeline-title { font-size: 0.875rem; font-weight: 600; margin-bottom: 0.25rem; }
        .timeline-time { font-size: 0.75rem; color: var(--text-muted); }
        .sla-card h3, .insight-card h3 { font-size: 0.875rem; font-weight: 700; text-transform: uppercase; color: var(--text-muted); margin-bottom: 1.5rem; }
        .sla-timer { display: flex; align-items: center; gap: 1rem; padding: 1.5rem; background: #f0f9ff; border-radius: var(--radius-md); color: var(--primary); margin-bottom: 1.5rem; }
        .sla-timer.overdue { background: #fef2f2; color: var(--danger); }
        .timer-val { font-size: 1.5rem; font-weight: 700; }
        .timer-label { font-size: 0.75rem; font-weight: 500; opacity: 0.8; }
        .sla-row { display: flex; justify-content: space-between; padding: 0.75rem 0; border-bottom: 1px solid var(--border); font-size: 0.875rem; }
        .sla-row:last-child { border: none; }
        .sentiment-display { display: flex; align-items: center; gap: 0.75rem; margin-top: 0.5rem; }
        .sentiment-bar { flex: 1; height: 6px; background: #f1f5f9; border-radius: 3px; overflow: hidden; }
        .sentiment-bar .fill { height: 100%; border-radius: 3px; transition: all 0.5s ease-out; }
        .insight-item { margin-bottom: 1.5rem; }
        .insight-label { font-size: 0.75rem; font-weight: 600; color: var(--text-muted); margin-bottom: 0.5rem; }
        .brand-black { color: #000000; font-weight: 700; }
      `}</style>
    </div>
  );
};

export default ComplaintDetail;
