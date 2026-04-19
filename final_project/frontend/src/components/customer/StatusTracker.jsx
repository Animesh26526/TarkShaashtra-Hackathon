import React, { useState, useEffect } from 'react';
import { Clock, CheckCircle2, AlertCircle, Timer } from 'lucide-react';
import { motion } from 'framer-motion';

const StatusTracker = ({ status, deadline, createdAt }) => {
  const [timeLeft, setTimeLeft] = useState('');

  useEffect(() => {
    const calculateTimeLeft = () => {
      const difference = new Date(deadline) - new Date();
      if (difference <= 0) {
        return "SLA Breached";
      }

      const hours = Math.floor((difference / (1000 * 60 * 60)));
      const minutes = Math.floor((difference / 1000 / 60) % 60);
      const seconds = Math.floor((difference / 1000) % 60);

      return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    };

    const timer = setInterval(() => {
      setTimeLeft(calculateTimeLeft());
    }, 1000);

    return () => clearInterval(timer);
  }, [deadline]);

  const getStatusColor = () => {
    switch (status) {
      case 'Open': return 'status-open';
      case 'In Progress': return 'status-progress';
      case 'Resolved': return 'status-resolved';
      default: return '';
    }
  };

  return (
    <div className={`status-tracker ${getStatusColor()}`}>
      <div className="status-main">
        <div className="status-indicator">
          {status === 'Resolved' ? <CheckCircle2 size={24} /> : <AlertCircle size={24} />}
          <div className="status-text">
            <span className="status-label">Current Status</span>
            <span className="status-value">{status}</span>
          </div>
        </div>

        {status !== 'Resolved' && (
          <div className="sla-block">
            <div className="sla-label">
              <Clock size={14} />
              <span>Time Until SLA Completion</span>
            </div>
            <div className="sla-timer">
              {timeLeft}
            </div>
          </div>
        )}
      </div>

      <div className="progress-bar-container">
        <div className="progress-track" />
        <motion.div 
          initial={{ width: 0 }}
          animate={{ 
            width: status === 'Resolved' ? '100%' : status === 'In Progress' ? '60%' : '15%' 
          }}
          className="progress-fill"
        />
      </div>
      
      <div className="footer-info">
        <Timer size={12} />
        <span>Case opened on {new Date(createdAt).toLocaleDateString()} at {new Date(createdAt).toLocaleTimeString()}</span>
      </div>

      <style>{`
        .status-tracker {
          background: white;
          border-radius: var(--radius-lg);
          padding: 1.5rem;
          border: 1px solid var(--border);
          box-shadow: var(--shadow-sm);
          position: relative;
          overflow: hidden;
        }

        .status-main {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 1.5rem;
        }

        .status-indicator {
          display: flex;
          align-items: center;
          gap: 1rem;
        }

        .status-text {
          display: flex;
          flex-direction: column;
        }

        .status-label {
          font-size: 0.75rem;
          text-transform: uppercase;
          color: var(--text-muted);
          font-weight: 600;
          letter-spacing: 0.05em;
        }

        .status-value {
          font-size: 1.25rem;
          font-weight: 700;
        }

        .sla-block {
          text-align: right;
        }

        .sla-label {
          display: flex;
          align-items: center;
          justify-content: flex-end;
          gap: 0.5rem;
          font-size: 0.75rem;
          color: var(--text-muted);
          margin-bottom: 0.25rem;
        }

        .sla-timer {
          font-family: 'Monaco', 'Consolas', monospace;
          font-size: 1.5rem;
          font-weight: 700;
          color: var(--primary);
        }

        .progress-bar-container {
          height: 6px;
          background: #f1f5f9;
          border-radius: 3px;
          position: relative;
          margin-bottom: 1rem;
        }

        .progress-track {
          position: absolute;
          inset: 0;
          background: #f1f5f9;
          border-radius: 3px;
        }

        .progress-fill {
          position: absolute;
          left: 0;
          top: 0;
          bottom: 0;
          background: var(--primary);
          border-radius: 3px;
          box-shadow: 0 0 10px rgba(29, 78, 216, 0.3);
        }

        .footer-info {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          font-size: 0.7rem;
          color: var(--text-muted);
        }

        /* Status Colors */
        .status-open .status-value { color: var(--danger); }
        .status-progress .status-value { color: var(--warning); }
        .status-progress .progress-fill { background: var(--warning); box-shadow: 0 0 10px rgba(245, 158, 11, 0.3); }
        .status-resolved .status-value { color: var(--success); }
        .status-resolved .progress-fill { background: var(--success); box-shadow: 0 0 10px rgba(16, 185, 129, 0.3); }
      `}</style>
    </div>
  );
};

export default StatusTracker;
