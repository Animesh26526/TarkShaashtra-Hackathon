import React, { useState, useMemo } from 'react';
import { Download, FileText, Filter, Eye, Calendar } from 'lucide-react';
import { useApp } from '../context/AppContext';

const OpsExport = () => {
  const { complaints } = useApp();
  const [filters, setFilters] = useState({ category: 'All', priority: 'All', status: 'All', from: '', to: '' });
  const [showPreview, setShowPreview] = useState(false);

  const filtered = useMemo(() => {
    return complaints.filter(c => {
      const matchesCat = filters.category === 'All' || c.category === filters.category;
      const matchesPri = filters.priority === 'All' || c.priority === filters.priority;
      const matchesStat = filters.status === 'All' || c.status === filters.status;
      let matchesDate = true;
      if (filters.from && c.createdAt) matchesDate = matchesDate && new Date(c.createdAt) >= new Date(filters.from);
      if (filters.to && c.createdAt) matchesDate = matchesDate && new Date(c.createdAt) <= new Date(filters.to + 'T23:59:59');
      return matchesCat && matchesPri && matchesStat && matchesDate;
    });
  }, [complaints, filters]);

  const downloadCSV = () => {
    const params = new URLSearchParams();
    if (filters.category !== 'All') params.set('category', filters.category);
    if (filters.priority !== 'All') params.set('priority', filters.priority);
    if (filters.status !== 'All') params.set('status', filters.status);
    if (filters.from) params.set('from', filters.from);
    if (filters.to) params.set('to', filters.to);
    window.location.href = '/api/export/csv?' + params.toString();
  };

  const downloadPDF = () => {
    window.location.href = '/api/export/pdf';
  };

  return (
    <div className="ops-export">
      <div className="export-header">
        <div>
          <h1>Backup & Export</h1>
          <p>Download filtered complaint data for local backup and reporting.</p>
        </div>
      </div>

      <div className="card filter-card">
        <h3><Filter size={16} /> Filter Data for Export</h3>
        <div className="filter-grid">
          <div className="filter-item">
            <label>Category</label>
            <select value={filters.category} onChange={e => setFilters(f => ({ ...f, category: e.target.value }))}>
              <option value="All">All Categories</option>
              <option value="Product">Product</option>
              <option value="Packaging">Packaging</option>
              <option value="Trade">Trade</option>
            </select>
          </div>
          <div className="filter-item">
            <label>Priority</label>
            <select value={filters.priority} onChange={e => setFilters(f => ({ ...f, priority: e.target.value }))}>
              <option value="All">All Priorities</option>
              <option value="High">High</option>
              <option value="Medium">Medium</option>
              <option value="Low">Low</option>
            </select>
          </div>
          <div className="filter-item">
            <label>Status</label>
            <select value={filters.status} onChange={e => setFilters(f => ({ ...f, status: e.target.value }))}>
              <option value="All">All Statuses</option>
              <option value="Open">Open</option>
              <option value="Resolved">Resolved</option>
              <option value="Escalated">Escalated</option>
            </select>
          </div>
          <div className="filter-item">
            <label>Date From</label>
            <input type="date" value={filters.from} onChange={e => setFilters(f => ({ ...f, from: e.target.value }))} />
          </div>
          <div className="filter-item">
            <label>Date To</label>
            <input type="date" value={filters.to} onChange={e => setFilters(f => ({ ...f, to: e.target.value }))} />
          </div>
        </div>

        <div className="filter-summary">{filtered.length} complaints match current filters.</div>

        <div className="export-actions">
          <button className="btn btn-primary" onClick={downloadCSV}>
            <Download size={16} /> Download CSV Backup
          </button>
          <button className="btn btn-outline" onClick={downloadPDF}>
            <FileText size={16} /> Download PDF Report
          </button>
          <button className="btn btn-outline" onClick={() => setShowPreview(!showPreview)}>
            <Eye size={16} /> {showPreview ? 'Hide Preview' : 'Preview Selection'}
          </button>
        </div>
      </div>

      {showPreview && (
        <div className="card preview-card">
          <h3>Preview — {filtered.length} records</h3>
          <div className="table-wrapper">
            <table className="data-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Title</th>
                  <th>Category</th>
                  <th>Priority</th>
                  <th>Status</th>
                  <th>Resolution Time</th>
                </tr>
              </thead>
              <tbody>
                {filtered.slice(0, 50).map(c => (
                  <tr key={c.id}>
                    <td><span className="id-tag">{c.id}</span></td>
                    <td>{c.title}</td>
                    <td><span className="badge category-badge">{c.category}</span></td>
                    <td><span className={`badge priority-${(c.priority || 'low').toLowerCase()}`}>{c.priority}</span></td>
                    <td><span className={`status-tag ${(c.status || '').toLowerCase()}`}>{c.status}</span></td>
                    <td>{c.resolutionTime ? c.resolutionTime + 'h' : '--'}</td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr><td colSpan={6} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '2rem' }}>No complaints match the current filters.</td></tr>
                )}
              </tbody>
            </table>
          </div>
          {filtered.length > 50 && (
            <p className="truncation-notice">Showing first 50 of {filtered.length} records. Full data included in export.</p>
          )}
        </div>
      )}

      <style>{`
        .ops-export { display: flex; flex-direction: column; gap: 1.5rem; }
        .export-header h1 { font-size: 1.875rem; font-weight: 700; margin-bottom: 0.25rem; }
        .export-header p { color: var(--text-muted); }
        .filter-card { padding: 2rem; }
        .filter-card h3 { display: flex; align-items: center; gap: 0.5rem; font-size: 1rem; margin-bottom: 1.25rem; }
        .filter-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(180px, 1fr)); gap: 1rem; margin-bottom: 1.25rem; }
        .filter-item { display: flex; flex-direction: column; gap: 0.375rem; }
        .filter-item label { font-size: 0.75rem; font-weight: 600; color: var(--text-muted); text-transform: uppercase; }
        .filter-item select, .filter-item input { padding: 0.625rem; border: 1px solid var(--border); border-radius: var(--radius-md); font-size: 0.85rem; background: white; }
        .filter-summary { font-size: 0.85rem; color: var(--text-muted); margin-bottom: 1.5rem; }
        .export-actions { display: flex; gap: 0.75rem; flex-wrap: wrap; }
        .btn { display: flex; align-items: center; gap: 0.5rem; padding: 0.75rem 1.25rem; border-radius: var(--radius-md); font-weight: 600; font-size: 0.875rem; border: none; cursor: pointer; transition: all 0.2s; }
        .btn-primary { background: var(--primary); color: white; }
        .btn-primary:hover { background: #1e40af; }
        .btn-outline { background: white; border: 1px solid var(--border); color: var(--text-main); }
        .btn-outline:hover { background: #f8fafc; }

        .preview-card { padding: 1.5rem; }
        .preview-card h3 { font-size: 1rem; font-weight: 700; margin-bottom: 1rem; }
        .table-wrapper { overflow-x: auto; }
        .data-table { width: 100%; border-collapse: collapse; font-size: 0.85rem; }
        .data-table th { font-size: 0.7rem; font-weight: 700; text-transform: uppercase; color: var(--text-muted); letter-spacing: 0.05em; padding: 0.75rem; text-align: left; border-bottom: 1px solid var(--border); }
        .data-table td { padding: 0.75rem; border-bottom: 1px solid #f1f5f9; }
        .id-tag { font-family: monospace; font-size: 0.75rem; padding: 0.2rem 0.5rem; background: #f1f5f9; border-radius: 4px; font-weight: 600; }
        .badge { padding: 0.2rem 0.75rem; border-radius: 9999px; font-size: 0.7rem; font-weight: 700; }
        .category-badge { background: #dbeafe; color: #1e40af; }
        .priority-high { background: #fee2e2; color: #991b1b; }
        .priority-medium { background: #fef3c7; color: #92400e; }
        .priority-low { background: #d1fae5; color: #065f46; }
        .status-tag { font-size: 0.7rem; font-weight: 700; text-transform: uppercase; padding: 0.2rem 0.5rem; border-radius: 4px; }
        .status-tag.open { background: #fee2e2; color: #991b1b; }
        .status-tag.resolved { background: #d1fae5; color: #065f46; }
        .status-tag.escalated { background: #fef3c7; color: #92400e; }
        .truncation-notice { font-size: 0.8rem; color: var(--text-muted); text-align: center; margin-top: 1rem; font-style: italic; }
      `}</style>
    </div>
  );
};

export default OpsExport;
