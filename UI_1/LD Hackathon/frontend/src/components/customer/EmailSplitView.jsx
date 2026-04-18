import React, { useState } from 'react';
import { Send, Sparkles, User, Mail, ShieldCheck } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const EmailSplitView = ({ onGenerate, isGenerating, aiResponse, onFinalSubmit }) => {
  const [emailData, setEmailData] = useState({
    recipient: '',
    subject: '',
    body: ''
  });

  const handleGenerate = () => {
    if (emailData.recipient && emailData.subject && emailData.body) {
      onGenerate(emailData);
    }
  };

  return (
    <div className="email-split-container">
      <div className="pane user-input-pane">
        <div className="pane-header">
          <User size={18} />
          <span>New Message</span>
        </div>
        
        <div className="input-form">
          <div className="email-row">
            <label>To:</label>
            <input 
              type="text" 
              placeholder="Recipient Name"
              value={emailData.recipient}
              onChange={(e) => setEmailData({...emailData, recipient: e.target.value})}
            />
          </div>
          <div className="email-row">
            <label>Subject:</label>
            <input 
              type="text" 
              placeholder="Complaint Subject"
              value={emailData.subject}
              onChange={(e) => setEmailData({...emailData, subject: e.target.value})}
            />
          </div>
          <textarea 
            className="email-body-input"
            placeholder="Describe your issue..."
            value={emailData.body}
            onChange={(e) => setEmailData({...emailData, body: e.target.value})}
            rows={10}
          />
          
          <button 
            className="generate-btn" 
            onClick={handleGenerate}
            disabled={isGenerating || !emailData.body}
          >
            {isGenerating ? (
              <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1 }}>
                <Sparkles size={18} />
              </motion.div>
            ) : <Sparkles size={18} />}
            <span>{isGenerating ? 'AI is drafting...' : 'Draft with AI'}</span>
          </button>
        </div>
      </div>

      <div className="pane ai-response-pane">
        <div className="pane-header ai">
          <Sparkles size={18} color="var(--primary)" />
          <span>Resolvo AI Draft</span>
        </div>

        <div className="ai-content">
          <AnimatePresence mode="wait">
            {!aiResponse ? (
              <motion.div 
                key="empty"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="empty-state"
              >
                <div className="empty-icon">🤖</div>
                <p>Fill in the details and click <br/><strong>Draft with AI</strong> to generate a professional reply</p>
              </motion.div>
            ) : (
              <motion.div 
                key="response"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                className="email-preview"
              >
                <div className="email-chip">Draft Ready</div>
                <div className="preview-subject">{aiResponse.subject}</div>
                <pre className="preview-body">
                  {aiResponse.response}
                </pre>
                
                <div className="ai-footer">
                  <div className="human-verification">
                    <ShieldCheck size={14} color="var(--success)" />
                    <span>Verified AI Quality</span>
                  </div>
                  <button 
                    className="submit-btn" 
                    onClick={() => onFinalSubmit(emailData, aiResponse)}
                  >
                    <Send size={16} />
                    Submit Final Complaint
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      <style jsx>{`
        .email-split-container {
          display: flex;
          gap: 2rem;
          min-height: 500px;
          animation: slideUp 0.5s ease-out;
        }

        @keyframes slideUp {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }

        .pane {
          flex: 1;
          background: white;
          border: 1px solid var(--border);
          border-radius: var(--radius-lg);
          display: flex;
          flex-direction: column;
          overflow: hidden;
          box-shadow: var(--shadow-md);
        }

        .pane-header {
          padding: 1rem;
          background: #f8fafc;
          border-bottom: 1px solid var(--border);
          display: flex;
          align-items: center;
          gap: 0.75rem;
          font-weight: 600;
          font-size: 0.875rem;
          color: var(--text-main);
        }

        .pane-header.ai {
          background: var(--primary-light);
          color: var(--primary);
        }

        .input-form {
          padding: 1.5rem;
          display: flex;
          flex-direction: column;
          gap: 1rem;
          flex: 1;
        }

        .email-row {
          display: flex;
          align-items: center;
          gap: 1rem;
          border-bottom: 1px solid #f1f5f9;
          padding-bottom: 0.5rem;
        }

        .email-row label {
          font-size: 0.875rem;
          color: var(--text-muted);
          width: 60px;
        }

        .email-row input {
          flex: 1;
          border: none;
          outline: none;
          font-size: 0.875rem;
          color: var(--text-main);
        }

        .email-body-input {
          flex: 1;
          border: none;
          outline: none;
          resize: none;
          font-family: inherit;
          font-size: 0.875rem;
          line-height: 1.6;
          padding: 0.5rem 0;
        }

        .generate-btn {
          margin-top: 1rem;
          padding: 0.75rem;
          background: #f1f5f9;
          border: none;
          border-radius: var(--radius-md);
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.5rem;
          font-weight: 600;
          color: var(--text-main);
          transition: all 0.2s;
        }

        .generate-btn:hover:not(:disabled) {
          background: var(--primary-light);
          color: var(--primary);
        }

        .generate-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .ai-content {
          padding: 2rem;
          flex: 1;
          display: flex;
          flex-direction: column;
          background: #fcfdfe;
        }

        .empty-state {
          flex: 1;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          text-align: center;
          color: var(--text-muted);
        }

        .empty-icon {
          font-size: 3rem;
          margin-bottom: 1.5rem;
        }

        .email-preview {
          display: flex;
          flex-direction: column;
          height: 100%;
        }

        .email-chip {
          background: var(--success);
          color: white;
          font-size: 0.625rem;
          font-weight: 800;
          text-transform: uppercase;
          padding: 0.25rem 0.5rem;
          border-radius: 4px;
          align-self: flex-start;
          margin-bottom: 1rem;
        }

        .preview-subject {
          font-weight: 700;
          font-size: 1.125rem;
          margin-bottom: 1.5rem;
          color: var(--text-main);
        }

        .preview-body {
          flex: 1;
          font-family: inherit;
          font-size: 0.875rem;
          white-space: pre-wrap;
          line-height: 1.6;
          color: #475569;
        }

        .ai-footer {
          margin-top: 2rem;
          padding-top: 1.5rem;
          border-top: 1px solid #f1f5f9;
          display: flex;
          align-items: center;
          justify-content: space-between;
        }

        .human-verification {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          font-size: 0.75rem;
          color: var(--text-muted);
        }

        .submit-btn {
          padding: 0.75rem 1.25rem;
          background: var(--primary);
          color: white;
          border: none;
          border-radius: var(--radius-md);
          display: flex;
          align-items: center;
          gap: 0.5rem;
          font-weight: 600;
          box-shadow: 0 4px 12px rgba(29, 78, 216, 0.2);
        }

        @media (max-width: 768px) {
          .email-split-container {
            flex-direction: column;
          }
        }
      `}</style>
    </div>
  );
};

export default EmailSplitView;
