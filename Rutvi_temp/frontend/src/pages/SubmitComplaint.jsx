import React, { useState, useEffect } from 'react';
import { 
  Send, 
  RefreshCcw, 
  CheckCircle2, 
  AlertTriangle, 
  UserRound,
  FileText,
  Mail,
  Phone
} from 'lucide-react';
import { useApp } from '../context/AppContext';

const SubmitComplaint = () => {
  const { addComplaint } = useApp();
  const [formData, setFormData] = useState({ title: '', description: '', type: 'Text' });
  const [attempts, setAttempts] = useState(0);
  const [aiPreview, setAiPreview] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showForm, setShowForm] = useState(true);
  const [escalateChecked, setEscalateChecked] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const response = await fetch('/api/classify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ description: formData.description })
      });
      const data = await response.json();
      
      setAiPreview(data);
      setAttempts(attempts + 1);
      setIsSubmitting(false);
      setShowForm(false);
    } catch (error) {
      console.error('Error in classification:', error);
      setIsSubmitting(false);
    }
  };

  const handleFinalSubmit = () => {
    addComplaint({
      ...formData,
      attempts,
      escalated: escalateChecked
    });
    // Reset or show success
    setAiPreview(null);
    setShowForm(true);
    setAttempts(0);
    setFormData({ title: '', description: '', type: 'Text' });
  };

  const handleRetry = () => {
    setShowForm(true);
    setAiPreview(null);
  };

  return (
    <div className="submit-page">
      <div className="page-header">
        <h1>Submit New Complaint</h1>
        <p>Our processing engine will classify and draft a resolution instantly.</p>
      </div>

      <div className="submit-container">
        {showForm ? (
          <form className="card submission-card" onSubmit={handleSubmit}>
            <div className="input-tabs">
              <button 
                type="button" 
                className={`tab ${formData.type === 'Text' ? 'active' : ''}`}
                onClick={() => setFormData({...formData, type: 'Text'})}
              >
                <FileText size={16} /> Text
              </button>
              <button 
                type="button" 
                className={`tab ${formData.type === 'Email' ? 'active' : ''}`}
                onClick={() => setFormData({...formData, type: 'Email'})}
              >
                <Mail size={16} /> Email
              </button>
              <button 
                type="button" 
                className={`tab ${formData.type === 'Call' ? 'active' : ''}`}
                onClick={() => setFormData({...formData, type: 'Call'})}
              >
                <Phone size={16} /> Call Summary
              </button>
            </div>

            <div className="form-group">
              <label>Complaint Title</label>
              <input 
                type="text" 
                required 
                placeholder="e.g., Product arrived with broken bottle"
                value={formData.title}
                onChange={(e) => setFormData({...formData, title: e.target.value})}
              />
            </div>

            <div className="form-group">
              <label>Detailed Description</label>
              <textarea 
                required 
                rows={6}
                placeholder="Describe the issue in detail. The system works better with more context..."
                value={formData.description}
                onChange={(e) => setFormData({...formData, description: e.target.value})}
              ></textarea>
            </div>

            <div className="form-footer">
              <p className="attempt-counter">Attempt {attempts + 1} of 3</p>
              <button type="submit" className="btn btn-primary" disabled={isSubmitting}>
                {isSubmitting ? <RefreshCcw className="spinning" size={18} /> : <Send size={18} />}
                <span>{isSubmitting ? 'Processing...' : 'Submit to '} <span className="brand-black">Resolvo</span></span>
              </button>
            </div>
          </form>
        ) : (
          <div className="ai-preview-container">
            <div className="card ai-response-card">
              <div className="ai-badge">SYSTEM ANALYSIS COMPLETED</div>
              
              <div className="ai-main-grid">
                <div className="ai-stat-item">
                  <label>Classification</label>
                  <p className="ai-val">{aiPreview.category}</p>
                </div>
                <div className="ai-stat-item">
                  <label>Priority</label>
                  <p className={`ai-val priority-${aiPreview.priority.toLowerCase()}`}>
                    {aiPreview.priority}
                  </p>
                </div>
                <div className="ai-stat-item">
                  <label>Sentiment</label>
                  <p className="ai-val">{aiPreview.sentiment.icon} {aiPreview.sentiment.label}</p>
                </div>
                <div className="ai-stat-item">
                  <label>Confidence Assessment</label>
                  <p className="ai-val">{aiPreview.confidence}</p>
                </div>
              </div>

              <div className="ai-resolution-box">
                <div className="res-header">
                  <CheckCircle2 size={20} color="var(--success)" />
                  <h3><span className="brand-black">Resolvo</span> Recommendation</h3>
                </div>
                <p className="res-action">{aiPreview.resolution}</p>
                <p className="res-explanation">{aiPreview.explanation}</p>
              </div>

              {attempts < 3 ? (
                <div className="ai-actions">
                  <button className="btn btn-outline" onClick={handleRetry}>
                    <RefreshCcw size={16} /> Refine Complaint
                  </button>
                  <button className="btn btn-primary" onClick={handleFinalSubmit}>
                    Confirm System Recommendation
                  </button>
                </div>
              ) : (
                <div className="escalation-box">
                  <div className="escalation-header">
                    <AlertTriangle size={24} color="var(--warning)" />
                    <div>
                      <h4>Maximum system attempts reached</h4>
                      <p>If you're still not satisfied, you can escalate this to a specialist.</p>
                    </div>
                  </div>
                  
                  <label className="escalate-checkbox">
                    <input 
                      type="checkbox" 
                      checked={escalateChecked}
                      onChange={(e) => setEscalateChecked(e.target.checked)}
                    />
                    <span>I would like to talk to a human support agent</span>
                  </label>

                  <button className="btn btn-primary btn-block" onClick={handleFinalSubmit}>
                    <UserRound size={18} /> 
                    {escalateChecked ? 'Escalate to Support' : 'Finalize Submission'}
                  </button>
                </div>
              )}
            </div>
            
            <p className="preview-note">
              Note: Attempt {attempts}/3. {attempts === 2 ? 'Next submission will enable specialist escalation.' : ''}
            </p>
          </div>
        )}
      </div>

      <style jsx>{`
        .submit-page {
          max-width: 900px;
          margin: 0 auto;
        }

        .page-header {
          margin-bottom: 2rem;
        }

        .page-header h1 {
          font-size: 1.875rem;
          font-weight: 700;
          color: var(--text-main);
          margin-bottom: 0.5rem;
        }

        .page-header p {
          color: var(--text-muted);
        }

        .submission-card {
          padding: 2rem;
        }

        .input-tabs {
          display: flex;
          gap: 0.5rem;
          margin-bottom: 2rem;
          padding: 0.25rem;
          background: #f1f5f9;
          border-radius: var(--radius-md);
        }

        .tab {
          flex: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.5rem;
          padding: 0.625rem;
          border-radius: var(--radius-sm);
          border: none;
          background: transparent;
          color: var(--text-muted);
          font-weight: 500;
          font-size: 0.875rem;
          transition: all 0.2s;
        }

        .tab.active {
          background: white;
          color: var(--primary);
          box-shadow: var(--shadow-sm);
        }

        .form-group {
          margin-bottom: 1.5rem;
        }

        .form-group label {
          display: block;
          font-size: 0.875rem;
          font-weight: 500;
          margin-bottom: 0.5rem;
        }

        .form-group input, .form-group textarea {
          width: 100%;
          padding: 0.75rem;
          border: 1px solid var(--border);
          border-radius: var(--radius-md);
          font-size: 0.875rem;
          transition: border-color 0.2s;
        }

        .form-group input:focus, .form-group textarea:focus {
          border-color: var(--primary);
          outline: none;
        }

        .form-footer {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding-top: 1.5rem;
          border-top: 1px solid var(--border);
        }

        .attempt-counter {
          font-size: 0.875rem;
          color: var(--text-muted);
          font-weight: 500;
        }

        .spinning {
          animation: spin 1s linear infinite;
        }

        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }

        /* System Preview Styles */
        .ai-preview-container {
          animation: fadeIn 0.4s ease-out;
        }

        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }

        .ai-response-card {
          padding: 2.5rem;
          border: 2px solid var(--primary-light);
        }

        .ai-badge {
          display: inline-block;
          background: var(--primary-light);
          color: var(--primary);
          padding: 0.25rem 0.75rem;
          border-radius: 9999px;
          font-size: 0.625rem;
          font-weight: 700;
          letter-spacing: 0.1em;
          margin-bottom: 1.5rem;
        }

        .ai-main-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 1.5rem;
          margin-bottom: 2rem;
        }

        .ai-stat-item label {
          display: block;
          font-size: 0.75rem;
          color: var(--text-muted);
          text-transform: uppercase;
          font-weight: 600;
          margin-bottom: 0.25rem;
        }

        .ai-val {
          font-weight: 600;
          font-size: 1rem;
        }

        .priority-high { color: var(--danger); }
        .priority-medium { color: var(--warning); }
        .priority-low { color: var(--success); }

        .ai-resolution-box {
          background: #f8fafc;
          border: 1px solid var(--border);
          border-radius: var(--radius-lg);
          padding: 1.5rem;
          margin-bottom: 2rem;
        }

        .res-header {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          margin-bottom: 1rem;
        }

        .res-header h3 {
          font-size: 1.125rem;
          font-weight: 600;
        }

        .res-action {
          font-size: 1.25rem;
          font-weight: 700;
          color: var(--primary);
          margin-bottom: 0.5rem;
        }

        .res-explanation {
          color: var(--text-muted);
          line-height: 1.6;
        }

        .ai-actions {
          display: flex;
          gap: 1rem;
          justify-content: flex-end;
        }

        .escalation-box {
          background: #fffbeb;
          border: 1px solid #fde68a;
          border-radius: var(--radius-md);
          padding: 1.5rem;
        }

        .escalation-header {
          display: flex;
          gap: 1rem;
          margin-bottom: 1.5rem;
        }

        .escalation-header h4 {
          font-weight: 600;
          margin-bottom: 0.25rem;
        }

        .escalation-header p {
          font-size: 0.875rem;
          color: #92400e;
        }

        .escalate-checkbox {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          margin-bottom: 1.5rem;
          cursor: pointer;
          font-weight: 500;
        }

        .escalate-checkbox input {
          width: 18px;
          height: 18px;
        }

        .brand-black {
          color: #000000;
          font-weight: 700;
        }

        .btn-block {
          width: 100%;
        }

        .preview-note {
          text-align: center;
          margin-top: 1.5rem;
          font-size: 0.875rem;
          color: var(--text-muted);
        }
      `}</style>
    </div>
  );
};

export default SubmitComplaint;
