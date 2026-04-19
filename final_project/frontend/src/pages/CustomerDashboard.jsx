import React, { useState } from 'react';
import { 
  Plus, 
  History, 
  Search, 
  Filter,
  ArrowRight,
  Clock,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useApp } from '../context/AppContext';
import SubmitComplaint from './SubmitComplaint';
import StatusTracker from '../components/customer/StatusTracker';

const CustomerDashboard = () => {
  const { complaints, userRole } = useApp();
  const [view, setView] = useState('history'); // history, new
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedComplaint, setSelectedComplaint] = useState(null);

  // Filter complaints for the customer (they usually only see their own, 
  // but in this demo we'll show all or just mock it)
  const customerComplaints = complaints; 

  const filteredComplaints = customerComplaints.filter(c => 
    c.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.id.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="customer-dashboard">
      <div className="dashboard-header">
        <div>
          <h1>Welcome back, <span className="brand-black">Resolvo</span> Customer</h1>
          <p>Track your active cases and get instant AI-powered resolutions.</p>
        </div>
        <div className="header-actions">
          <button 
            className={`btn ${view === 'history' ? 'btn-primary' : 'btn-outline'}`}
            onClick={() => setView('history')}
          >
            <History size={18} /> My Cases
          </button>
          <button 
            className={`btn ${view === 'new' ? 'btn-primary' : 'btn-outline'}`}
            onClick={() => setView('new')}
          >
            <Plus size={18} /> New Complaint
          </button>
        </div>
      </div>

      <AnimatePresence mode="wait">
        {view === 'new' ? (
          <motion.div 
            key="new-flow"
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.98 }}
          >
            <SubmitComplaint />
          </motion.div>
        ) : (
          <motion.div 
            key="history-view"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="history-view"
          >
            <div className="history-controls">
              <div className="search-bar">
                <Search size={18} />
                <input 
                  type="text" 
                  placeholder="Search by ID or Title..." 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              <div className="filter-group">
                <Filter size={18} />
                <span>Filter by Status</span>
              </div>
            </div>

            <div className="complaint-grid">
              <div className="complaint-list card">
                {filteredComplaints.length === 0 ? (
                  <div className="empty-history">
                    <History size={48} />
                    <p>No complaints found.</p>
                  </div>
                ) : (
                  filteredComplaints.map(c => (
                    <motion.div 
                      key={c.id} 
                      whileHover={{ x: 5 }}
                      onClick={() => setSelectedComplaint(c)}
                      className={`complaint-item ${selectedComplaint?.id === c.id ? 'active' : ''}`}
                    >
                      <div className="item-main">
                        <div className="item-id">{c.id}</div>
                        <div className="item-title">{c.title}</div>
                        <div className="item-meta">
                          <span className={`status-tag ${c.status.toLowerCase().replace(' ', '-')}`}>
                            {c.status}
                          </span>
                          <span className="item-date">{new Date(c.createdAt).toLocaleDateString()}</span>
                        </div>
                      </div>
                      <ArrowRight size={16} />
                    </motion.div>
                  ))
                )}
              </div>

              <div className="complaint-detail-pane">
                <AnimatePresence mode="wait">
                  {selectedComplaint ? (
                    <motion.div 
                      key={selectedComplaint.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="detail-content"
                    >
                      <StatusTracker 
                        status={selectedComplaint.status}
                        deadline={selectedComplaint.slaDeadline}
                        createdAt={selectedComplaint.createdAt}
                      />

                      <div className="card detail-info">
                        <h3>Case Details</h3>
                        <div className="detail-row">
                          <label>Description</label>
                          <p>{selectedComplaint.description}</p>
                        </div>
                        <div className="detail-row">
                          <label>Channel</label>
                          <p className="channel-badge">{selectedComplaint.type || 'Text'}</p>
                        </div>
                        {selectedComplaint.resolution && (
                          <div className="resolution-block">
                            <div className="res-header">
                              <CheckCircle2 size={18} color="var(--success)" />
                              <span>AI Recommended Resolution</span>
                            </div>
                            <p className="res-text">{selectedComplaint.resolution}</p>
                          </div>
                        )}
                      </div>
                    </motion.div>
                  ) : (
                    <div className="detail-placeholder">
                      <AlertCircle size={32} />
                      <p>Select a complaint to view real-time status and AI resolution history.</p>
                    </div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <style>{`
        .customer-dashboard {
          padding: 1rem 0;
        }

        .dashboard-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 2.5rem;
        }

        .dashboard-header h1 {
          font-size: 2rem;
          font-weight: 800;
          letter-spacing: -0.025em;
          margin-bottom: 0.5rem;
        }

        .dashboard-header p {
          color: var(--text-muted);
        }

        .header-actions {
          display: flex;
          gap: 0.75rem;
        }

        .history-controls {
          display: flex;
          gap: 1.5rem;
          margin-bottom: 1.5rem;
        }

        .search-bar {
          flex: 1;
          display: flex;
          align-items: center;
          gap: 0.75rem;
          padding: 0.75rem 1.25rem;
          background: white;
          border: 1px solid var(--border);
          border-radius: var(--radius-md);
          box-shadow: var(--shadow-sm);
        }

        .search-bar input {
          flex: 1;
          border: none;
          outline: none;
          font-size: 0.875rem;
        }

        .filter-group {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          padding: 0 1.25rem;
          background: white;
          border: 1px solid var(--border);
          border-radius: var(--radius-md);
          font-size: 0.875rem;
          font-weight: 600;
          color: var(--text-muted);
          cursor: pointer;
        }

        .complaint-grid {
          display: grid;
          grid-template-columns: 380px 1fr;
          gap: 2rem;
          height: calc(100vh - 250px);
        }

        .complaint-list {
          padding: 0;
          overflow-y: auto;
          display: flex;
          flex-direction: column;
        }

        .complaint-item {
          padding: 1.25rem 1.5rem;
          border-bottom: 1px solid var(--border);
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: space-between;
          transition: all 0.2s;
        }

        .complaint-item:hover {
          background: #f8fafc;
        }

        .complaint-item.active {
          background: var(--primary-light);
          border-left: 4px solid var(--primary);
        }

        .item-id {
          font-family: monospace;
          font-size: 0.75rem;
          color: var(--primary);
          font-weight: 700;
          margin-bottom: 0.25rem;
        }

        .item-title {
          font-weight: 700;
          font-size: 1rem;
          margin-bottom: 0.5rem;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          max-width: 250px;
        }

        .item-meta {
          display: flex;
          align-items: center;
          gap: 1rem;
        }

        .status-tag {
          font-size: 0.625rem;
          font-weight: 800;
          text-transform: uppercase;
          padding: 0.125rem 0.5rem;
          border-radius: 4px;
        }

        .status-tag.open { background: #fee2e2; color: #991b1b; }
        .status-tag.in-progress { background: #fef3c7; color: #92400e; }
        .status-tag.resolved { background: #d1fae5; color: #065f46; }

        .item-date {
          font-size: 0.75rem;
          color: var(--text-muted);
        }

        .empty-history {
          flex: 1;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          color: var(--text-muted);
          gap: 1rem;
        }

        .complaint-detail-pane {
          overflow-y: auto;
        }

        .detail-placeholder {
          height: 100%;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          color: var(--text-muted);
          text-align: center;
          gap: 1rem;
          padding: 2rem;
          border: 2px dashed var(--border);
          border-radius: var(--radius-lg);
        }

        .detail-info {
          margin-top: 2rem;
          padding: 2rem;
        }

        .detail-info h3 {
          font-size: 1.125rem;
          font-weight: 700;
          margin-bottom: 1.5rem;
          border-bottom: 1px solid var(--border);
          padding-bottom: 0.75rem;
        }

        .detail-row {
          margin-bottom: 1.5rem;
        }

        .detail-row label {
          display: block;
          font-size: 0.75rem;
          text-transform: uppercase;
          font-weight: 700;
          color: var(--text-muted);
          margin-bottom: 0.5rem;
        }

        .detail-row p {
          font-size: 0.9375rem;
          line-height: 1.6;
          color: #334155;
        }

        .channel-badge {
          display: inline-block;
          background: #f1f5f9;
          padding: 0.25rem 0.75rem;
          border-radius: 9999px;
          font-weight: 600;
        }

        .resolution-block {
          background: #f0fdf4;
          border: 1px solid #dcfce7;
          border-radius: var(--radius-md);
          padding: 1.5rem;
          margin-top: 1rem;
        }

        .res-header {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          font-weight: 700;
          color: #166534;
          margin-bottom: 0.75rem;
        }

        .res-text {
          font-style: italic;
          color: #15803d;
          font-size: 0.9375rem;
        }

        .brand-black { color: #000000; font-weight: 700; }

        @media (max-width: 1024px) {
          .complaint-grid { grid-template-columns: 1fr; height: auto; }
          .complaint-list { height: 400px; }
        }
      `}</style>
    </div>
  );
};

export default CustomerDashboard;
