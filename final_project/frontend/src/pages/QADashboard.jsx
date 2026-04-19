import React, { useState, useMemo } from 'react';
import { 
  Search, Filter, RefreshCw, CheckCircle2, AlertCircle, 
  ChevronDown, ChevronUp, Sparkles, FileSearch,
  ShieldCheck
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useApp } from '../context/AppContext';

const QADashboard = () => {
  const { complaints, classifyText } = useApp();
  const [filters, setFilters] = useState({ category: 'All', priority: 'All', status: 'All', search: '' });
  const [expandedId, setExpandedId] = useState(null);
  const [reviewResult, setReviewResult] = useState({});
  const [reviewingId, setReviewingId] = useState(null);
  const [manualText, setManualText] = useState('');
  const [manualResult, setManualResult] = useState(null);
  const [isManualReviewing, setIsManualReviewing] = useState(false);

  const filtered = useMemo(() => {
    return complaints.filter(c => {
      const matchesSearch = !filters.search || 
        c.id?.toLowerCase().includes(filters.search.toLowerCase()) ||
        c.title?.toLowerCase().includes(filters.search.toLowerCase()) ||
        (c.description || '').toLowerCase().includes(filters.search.toLowerCase());
      const matchesCat = filters.category === 'All' || c.category === filters.category;
      const matchesPri = filters.priority === 'All' || c.priority === filters.priority;
      const matchesStat = filters.status === 'All' || c.status === filters.status;
      return matchesSearch && matchesCat && matchesPri && matchesStat;
    });
  }, [complaints, filters]);

  const handleReReview = async (complaint) => {
    setReviewingId(complaint.id);
    const result = await classifyText(complaint.description || complaint.title);
    if (result) {
      setReviewResult(prev => ({ ...prev, [complaint.id]: result }));
    }
    setReviewingId(null);
  };

  const handleManualReview = async () => {
    if (!manualText.trim()) return;
    setIsManualReviewing(true);
    const result = await classifyText(manualText);
    setManualResult(result);
    setIsManualReviewing(false);
  };

  const getSentimentColor = (score) => {
    if (score < -0.3) return '#ef4444';
    if (score > 0.3) return '#10b981';
    return '#f59e0b';
  };

  const getSentimentPercent = (score) => Math.round(((score || 0) + 1) * 50);

  return (
    <div className="qa-dashboard">
      <div className="qa-header">
        <div>
          <h1>AI Re-Review & Quality Analysis</h1>
          <p>Re-analyze complaint classifications and verify AI accuracy across the database.</p>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="card filter-panel">
        <div className="filter-row">
          <div className="search-box">
            <Search size={16} />
            <input 
              placeholder="Search complaints..." 
              value={filters.search}
              onChange={e => setFilters(f => ({ ...f, search: e.target.value }))}
            />
          </div>
          <div className="filter-selects">
            <div className="select-group">
              <label>Category</label>
              <select value={filters.category} onChange={e => setFilters(f => ({ ...f, category: e.target.value }))}>
                <option>All</option>
                <option>Product</option>
                <option>Packaging</option>
                <option>Trade</option>
              </select>
            </div>
            <div className="select-group">
              <label>Priority</label>
              <select value={filters.priority} onChange={e => setFilters(f => ({ ...f, priority: e.target.value }))}>
                <option>All</option>
                <option>High</option>
                <option>Medium</option>
                <option>Low</option>
              </select>
            </div>
            <div className="select-group">
              <label>Status</label>
              <select value={filters.status} onChange={e => setFilters(f => ({ ...f, status: e.target.value }))}>
                <option>All</option>
                <option>Open</option>
                <option>Resolved</option>
                <option>Escalated</option>
              </select>
            </div>
          </div>
        </div>
        <div className="filter-summary">
          <span>{filtered.length} complaints found</span>
        </div>
      </div>

      {/* Card Grid */}
      <div className="qa-card-grid">
        {filtered.map((c, idx) => {
          const isExpanded = expandedId === c.id;
          const result = reviewResult[c.id];
          const sentPercent = getSentimentPercent(c.sentiment?.score);
          const sentColor = getSentimentColor(c.sentiment?.score);
          
          return (
            <motion.div 
              key={c.id} 
              className={`qa-card card ${isExpanded ? 'expanded' : ''}`}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.03 }}
              layout
            >
              <div className="qa-card-header" onClick={() => setExpandedId(isExpanded ? null : c.id)}>
                <div className="qa-card-id">
                  <span className="id-tag">{c.id}</span>
                  <span className={`status-tag ${(c.status || '').toLowerCase().replace(' ', '-')}`}>{c.status}</span>
                </div>
                {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
              </div>

              <h3 className="qa-card-title">{c.title}</h3>

              <div className="qa-card-badges">
                <span className="badge category-badge">{c.category || '--'}</span>
                <span className={`badge priority-${(c.priority || 'low').toLowerCase()}`}>{c.priority || '--'}</span>
              </div>

              <div className="qa-card-sentiment">
                <span className="sentiment-label">Sentiment: {c.sentiment?.label || 'Neutral'}</span>
                <div className="sentiment-track">
                  <div className="sentiment-fill" style={{ width: `${sentPercent}%`, background: sentColor }} />
                </div>
                <span className="sentiment-score" style={{ color: sentColor }}>{(c.sentiment?.score || 0).toFixed(3)}</span>
              </div>

              {c.resolution && (
                <div className="qa-card-resolution">
                  <strong>Resolution:</strong> {c.resolution}
                </div>
              )}

              <AnimatePresence>
                {isExpanded && (
                  <motion.div 
                    initial={{ height: 0, opacity: 0 }} 
                    animate={{ height: 'auto', opacity: 1 }} 
                    exit={{ height: 0, opacity: 0 }}
                    className="qa-card-details"
                  >
                    <div className="detail-section">
                      <label>Description</label>
                      <p>{c.description || 'No description available.'}</p>
                    </div>

                    <div className="detail-meta">
                      <div><label>Channel</label><span>{c.type || 'Text'}</span></div>
                      <div><label>Assigned</label><span>{c.assignedTo || 'Auto'}</span></div>
                      <div><label>Confidence</label><span>{c.confidence || '--'}</span></div>
                      <div><label>Created</label><span>{c.createdAt ? new Date(c.createdAt).toLocaleDateString() : '--'}</span></div>
                    </div>

                    <button 
                      className="re-review-btn"
                      onClick={(e) => { e.stopPropagation(); handleReReview(c); }}
                      disabled={reviewingId === c.id}
                    >
                      {reviewingId === c.id ? (
                        <><RefreshCw size={14} className="spinning" /> Analyzing...</>
                      ) : (
                        <><Sparkles size={14} /> Re-Classify with AI</>
                      )}
                    </button>

                    {result && (
                      <div className="review-result-box">
                        <div className="result-header">
                          <FileSearch size={14} />
                          <span>Re-Classification Result</span>
                        </div>
                        <div className="result-grid">
                          <div>
                            <label>Category</label>
                            <span className="badge category-badge">{result.category}</span>
                            <span className={`match-label ${result.category === c.category ? 'match' : 'mismatch'}`}>
                              {result.category === c.category ? 'Match' : 'Mismatch'}
                            </span>
                          </div>
                          <div>
                            <label>Priority</label>
                            <span className={`badge priority-${result.priority?.toLowerCase()}`}>{result.priority}</span>
                            <span className={`match-label ${result.priority === c.priority ? 'match' : 'mismatch'}`}>
                              {result.priority === c.priority ? 'Match' : 'Mismatch'}
                            </span>
                          </div>
                          <div>
                            <label>Sentiment</label>
                            <span>{result.sentiment?.label} ({(result.sentiment?.score || 0).toFixed(3)})</span>
                          </div>
                          <div>
                            <label>Confidence</label>
                            <span>{result.confidence}</span>
                          </div>
                        </div>
                        {result.resolution && (
                          <div className="result-resolution">
                            <strong>{result.resolution}</strong>
                            <p>{result.explanation || ''}</p>
                          </div>
                        )}
                      </div>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          );
        })}
      </div>

      {filtered.length === 0 && (
        <div className="empty-state-qa">
          <Search size={32} />
          <h3>No complaints match your filters</h3>
          <p>Try adjusting your search criteria.</p>
        </div>
      )}

      {/* Standalone Text Classification */}
      <div className="card manual-review-section">
        <h3><Sparkles size={18} /> Standalone Text Classification</h3>
        <p>Paste any complaint text for AI analysis without saving.</p>
        <textarea 
          value={manualText}
          onChange={e => setManualText(e.target.value)}
          placeholder="Paste any complaint text here for AI analysis..."
          rows={4}
        />
        <button 
          className="btn btn-primary"
          onClick={handleManualReview}
          disabled={isManualReviewing || !manualText.trim()}
        >
          {isManualReviewing ? 'Analyzing...' : 'Analyze Text'}
        </button>

        {manualResult && (
          <div className="review-result-box" style={{ marginTop: '1rem' }}>
            <div className="result-grid">
              <div>
                <label>Category</label>
                <span className="badge category-badge">{manualResult.category}</span>
              </div>
              <div>
                <label>Priority</label>
                <span className={`badge priority-${manualResult.priority?.toLowerCase()}`}>{manualResult.priority}</span>
              </div>
              <div>
                <label>Sentiment</label>
                <span>{manualResult.sentiment?.label} ({(manualResult.sentiment?.score || 0).toFixed(3)})</span>
              </div>
              <div>
                <label>Confidence</label>
                <span>{manualResult.confidence}</span>
              </div>
            </div>
            {manualResult.resolution && (
              <div className="result-resolution">
                <strong>{manualResult.resolution}</strong>
                <p>{manualResult.explanation || ''}</p>
              </div>
            )}
          </div>
        )}
      </div>

      <style>{`
        .qa-dashboard { display: flex; flex-direction: column; gap: 1.5rem; }
        .qa-header h1 { font-size: 1.875rem; font-weight: 700; margin-bottom: 0.25rem; }
        .qa-header p { color: var(--text-muted); }

        .filter-panel { padding: 1.25rem; }
        .filter-row { display: flex; gap: 1rem; align-items: flex-end; flex-wrap: wrap; }
        .search-box { display: flex; align-items: center; gap: 0.5rem; padding: 0.5rem 0.75rem; background: #f8fafc; border: 1px solid var(--border); border-radius: var(--radius-md); flex: 1; min-width: 200px; }
        .search-box input { border: none; outline: none; background: transparent; font-size: 0.875rem; width: 100%; }
        .filter-selects { display: flex; gap: 0.75rem; }
        .select-group { display: flex; flex-direction: column; gap: 0.25rem; }
        .select-group label { font-size: 0.7rem; font-weight: 600; color: var(--text-muted); text-transform: uppercase; }
        .select-group select { padding: 0.5rem; border: 1px solid var(--border); border-radius: var(--radius-md); font-size: 0.8rem; background: white; }
        .filter-summary { margin-top: 0.75rem; font-size: 0.8rem; color: var(--text-muted); }

        .qa-card-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(340px, 1fr)); gap: 1rem; }
        .qa-card { padding: 1.25rem; cursor: pointer; transition: all 0.2s; }
        .qa-card:hover { box-shadow: var(--shadow-md); transform: translateY(-2px); }
        .qa-card.expanded { cursor: default; }

        .qa-card-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.75rem; }
        .qa-card-id { display: flex; align-items: center; gap: 0.5rem; }
        .id-tag { font-family: monospace; font-size: 0.75rem; padding: 0.2rem 0.5rem; background: #f1f5f9; border-radius: 4px; font-weight: 600; }
        .status-tag { font-size: 0.65rem; font-weight: 700; text-transform: uppercase; padding: 0.2rem 0.5rem; border-radius: 4px; }
        .status-tag.open { background: #fee2e2; color: #991b1b; }
        .status-tag.resolved { background: #d1fae5; color: #065f46; }
        .status-tag.escalated { background: #fef3c7; color: #92400e; }
        .status-tag.in-progress { background: #e0e7ff; color: #3730a3; }

        .qa-card-title { font-size: 0.95rem; font-weight: 600; margin-bottom: 0.75rem; line-height: 1.4; }
        .qa-card-badges { display: flex; gap: 0.5rem; margin-bottom: 0.75rem; }
        .badge { padding: 0.2rem 0.75rem; border-radius: 9999px; font-size: 0.7rem; font-weight: 700; }
        .category-badge { background: #dbeafe; color: #1e40af; }
        .priority-high { background: #fee2e2; color: #991b1b; }
        .priority-medium { background: #fef3c7; color: #92400e; }
        .priority-low { background: #d1fae5; color: #065f46; }

        .qa-card-sentiment { display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.75rem; }
        .sentiment-label { font-size: 0.75rem; color: var(--text-muted); min-width: 100px; }
        .sentiment-track { flex: 1; height: 6px; background: #f1f5f9; border-radius: 3px; overflow: hidden; }
        .sentiment-fill { height: 100%; border-radius: 3px; transition: width 0.5s; }
        .sentiment-score { font-family: monospace; font-size: 0.75rem; font-weight: 600; min-width: 50px; text-align: right; }

        .qa-card-resolution { font-size: 0.8rem; color: var(--primary); background: var(--primary-light); padding: 0.5rem 0.75rem; border-radius: var(--radius-md); }

        .qa-card-details { overflow: hidden; }
        .detail-section { margin-top: 1rem; }
        .detail-section label { font-size: 0.7rem; font-weight: 700; text-transform: uppercase; color: var(--text-muted); display: block; margin-bottom: 0.25rem; }
        .detail-section p { font-size: 0.85rem; color: var(--text-secondary); line-height: 1.6; }
        .detail-meta { display: grid; grid-template-columns: repeat(2, 1fr); gap: 0.75rem; margin-top: 1rem; padding: 1rem; background: #f8fafc; border-radius: var(--radius-md); }
        .detail-meta label { font-size: 0.65rem; font-weight: 700; text-transform: uppercase; color: var(--text-muted); display: block; }
        .detail-meta span { font-size: 0.825rem; font-weight: 500; }

        .re-review-btn { 
          margin-top: 1rem; width: 100%; padding: 0.625rem; border: 1px solid var(--primary);
          background: white; color: var(--primary); border-radius: var(--radius-md);
          font-weight: 600; font-size: 0.825rem; display: flex; align-items: center;
          justify-content: center; gap: 0.5rem; cursor: pointer; transition: all 0.2s;
        }
        .re-review-btn:hover:not(:disabled) { background: var(--primary); color: white; }
        .re-review-btn:disabled { opacity: 0.6; cursor: not-allowed; }
        .spinning { animation: spin 1s linear infinite; }
        @keyframes spin { to { transform: rotate(360deg); } }

        .review-result-box { margin-top: 1rem; padding: 1rem; background: #f0f9ff; border: 1px solid #bfdbfe; border-radius: var(--radius-md); }
        .result-header { display: flex; align-items: center; gap: 0.5rem; font-size: 0.8rem; font-weight: 700; color: var(--primary); margin-bottom: 0.75rem; }
        .result-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 0.75rem; }
        .result-grid label { font-size: 0.65rem; font-weight: 700; text-transform: uppercase; color: var(--text-muted); display: block; margin-bottom: 0.25rem; }
        .match-label { font-size: 0.7rem; font-weight: 700; margin-left: 0.5rem; }
        .match-label.match { color: var(--success); }
        .match-label.mismatch { color: var(--danger); }
        .result-resolution { margin-top: 0.75rem; padding: 0.75rem; background: white; border-radius: var(--radius-md); }
        .result-resolution strong { color: var(--primary); font-size: 0.85rem; }
        .result-resolution p { font-size: 0.8rem; color: var(--text-secondary); margin-top: 0.25rem; }

        .empty-state-qa { text-align: center; padding: 4rem; color: var(--text-muted); }
        .empty-state-qa h3 { margin-top: 1rem; }

        .manual-review-section { padding: 1.5rem; }
        .manual-review-section h3 { display: flex; align-items: center; gap: 0.5rem; font-size: 1rem; margin-bottom: 0.25rem; }
        .manual-review-section > p { font-size: 0.85rem; color: var(--text-muted); margin-bottom: 1rem; }
        .manual-review-section textarea { width: 100%; padding: 0.75rem; border: 1px solid var(--border); border-radius: var(--radius-md); font-family: inherit; font-size: 0.875rem; resize: vertical; margin-bottom: 1rem; }
      `}</style>
    </div>
  );
};

export default QADashboard;
