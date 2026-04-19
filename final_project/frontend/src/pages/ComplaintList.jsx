import React, { useState } from 'react';
import { 
  Search, 
  Filter, 
  MoreHorizontal, 
  ExternalLink, 
  FilterX,
  Plus
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { useApp } from '../context/AppContext';

const ComplaintList = () => {
  const { complaints, userRole } = useApp();
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState({
    category: 'All',
    priority: 'All',
    status: 'All'
  });

  const filteredComplaints = complaints.filter(c => {
    const titleMatch = (c.title || c.text || '');
    const idMatch = (c.id || c.complaint_id || c.$id || '');
    const matchesSearch = titleMatch.toLowerCase().includes(searchTerm.toLowerCase()) || 
                         idMatch.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = filters.category === 'All' || c.category === filters.category;
    const matchesPriority = filters.priority === 'All' || c.priority === filters.priority;
    const matchesStatus = filters.status === 'All' || c.status === filters.status;
    
    return matchesSearch && matchesCategory && matchesPriority && matchesStatus;
  });

  const getPriorityClass = (p) => {
    if (p === 'High') return 'badge-danger';
    if (p === 'Medium') return 'badge-warning';
    return 'badge-success';
  };

  const getStatusClass = (s) => {
    if (s === 'Open') return 'badge-info';
    if (s === 'Resolved') return 'badge-success';
    if (s === 'Escalated') return 'badge-danger';
    return 'badge-warning';
  };

  return (
    <div className="complaint-list-page">
      <div className="page-header">
        <div>
          <h1>Complaint Management</h1>
          <p>View and manage all incoming support requests.</p>
        </div>
        {userRole === 'Customer' && (
          <Link to="/submit" className="btn btn-primary">
            <Plus size={18} />
            <span>New Complaint</span>
          </Link>
        )}
      </div>

      <div className="card filter-card">
        <div className="filter-group">
          <div className="search-box">
            <Search size={18} />
            <input 
              type="text" 
              placeholder="Search by ID or Title..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          
          <div className="select-group">
            <div className="select-item">
              <label>Category</label>
              <select value={filters.category} onChange={(e) => setFilters({...filters, category: e.target.value})}>
                <option>All</option>
                <option>Product</option>
                <option>Packaging</option>
                <option>Trade</option>
              </select>
            </div>
            <div className="select-item">
              <label>Priority</label>
              <select value={filters.priority} onChange={(e) => setFilters({...filters, priority: e.target.value})}>
                <option>All</option>
                <option>High</option>
                <option>Medium</option>
                <option>Low</option>
              </select>
            </div>
            <div className="select-item">
              <label>Status</label>
              <select value={filters.status} onChange={(e) => setFilters({...filters, status: e.target.value})}>
                <option>All</option>
                <option>Open</option>
                <option>Resolved</option>
                <option>In Progress</option>
                <option>Escalated</option>
              </select>
            </div>
          </div>

          <button className="btn-icon-label" onClick={() => setFilters({category: 'All', priority: 'All', status: 'All'})}>
            <FilterX size={16} />
            <span>Clear</span>
          </button>
        </div>
      </div>

      <div className="card table-card">
        <table className="data-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Title & Category</th>
              <th>Priority</th>
              <th>Status</th>
              <th>Assigned To</th>
              <th>Submitted</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {filteredComplaints.length > 0 ? (
              filteredComplaints.map((c) => {
                const displayId = c.id || c.complaint_id || c.$id || 'N/A';
                const displayTitle = c.title || c.text || 'No Title';
                const assignedTo = c.assignedTo || c.assigned_to || 'Unassigned';
                const dateVal = c.createdAt || c.$createdAt;
                return (
                <tr key={displayId}>
                  <td><span className="id-tag">{displayId}</span></td>
                  <td>
                    <div className="title-cell">
                      <p className="item-title">{displayTitle}</p>
                      <p className="item-subtext">{c.category}</p>
                    </div>
                  </td>
                  <td>
                    <span className={`badge ${getPriorityClass(c.priority)}`}>
                      {c.priority}
                    </span>
                  </td>
                  <td>
                    <span className={`badge ${getStatusClass(c.status)}`}>
                      {c.status}
                    </span>
                  </td>
                  <td>
                    <div className="agent-cell">
                      <div className="agent-avatar">{assignedTo.charAt(0)}</div>
                      <span>{assignedTo}</span>
                    </div>
                  </td>
                  <td>
                    <p className="date-text">{dateVal ? new Date(dateVal).toLocaleDateString() : 'N/A'}</p>
                  </td>
                  <td>
                    <Link to={`/complaints/${displayId}`} className="action-btn">
                      <ExternalLink size={18} />
                    </Link>
                  </td>
                </tr>
              )
            })
            ) : (
              <tr>
                <td colSpan="7" className="empty-state">
                  No complaints found matching your filters.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <style>{`
        .complaint-list-page {
          display: flex;
          flex-direction: column;
          gap: 1.5rem;
        }

        .page-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-end;
          margin-bottom: 0.5rem;
        }

        .page-header h1 {
          font-size: 1.875rem;
          font-weight: 700;
          color: var(--text-main);
          margin-bottom: 0.25rem;
        }

        .page-header p {
          color: var(--text-muted);
        }

        .filter-card {
          padding: 1.25rem;
        }

        .filter-group {
          display: flex;
          align-items: center;
          gap: 2rem;
        }

        .search-box {
          flex: 1;
          display: flex;
          align-items: center;
          gap: 0.75rem;
          background: #f1f5f9;
          padding: 0.625rem 1rem;
          border-radius: var(--radius-md);
          color: var(--text-muted);
        }

        .search-box input {
          border: none;
          background: transparent;
          width: 100%;
          outline: none;
          font-size: 0.875rem;
        }

        .select-group {
          display: flex;
          gap: 1.5rem;
        }

        .select-item {
          display: flex;
          flex-direction: column;
          gap: 0.25rem;
        }

        .select-item label {
          font-size: 0.75rem;
          font-weight: 600;
          color: var(--text-muted);
          text-transform: uppercase;
        }

        .select-item select {
          border: 1px solid var(--border);
          border-radius: var(--radius-sm);
          padding: 0.375rem 0.5rem;
          font-size: 0.875rem;
          background: white;
          min-width: 140px;
        }

        .btn-icon-label {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          background: transparent;
          border: none;
          color: var(--text-muted);
          font-size: 0.875rem;
          font-weight: 500;
          padding: 0.5rem;
          border-radius: var(--radius-sm);
          transition: background 0.2s;
        }

        .btn-icon-label:hover {
          background: #f1f5f9;
          color: var(--primary);
        }

        .table-card {
          padding: 0;
          overflow: hidden;
        }

        .data-table {
          width: 100%;
          border-collapse: collapse;
          text-align: left;
        }

        .data-table th {
          background: #f8fafc;
          padding: 1rem 1.5rem;
          font-size: 0.75rem;
          font-weight: 600;
          color: var(--secondary);
          text-transform: uppercase;
          border-bottom: 1px solid var(--border);
        }

        .data-table td {
          padding: 1.25rem 1.5rem;
          border-bottom: 1px solid var(--border);
          font-size: 0.875rem;
          vertical-align: middle;
        }

        .id-tag {
          font-family: monospace;
          background: #f1f5f9;
          padding: 0.25rem 0.5rem;
          border-radius: 4px;
          color: var(--text-muted);
          font-weight: 600;
        }

        .title-cell {
          display: flex;
          flex-direction: column;
        }

        .item-title {
          font-weight: 600;
          color: var(--text-main);
          margin-bottom: 0.125rem;
        }

        .item-subtext {
          font-size: 0.75rem;
          color: var(--text-muted);
        }

        .agent-cell {
          display: flex;
          align-items: center;
          gap: 0.75rem;
        }

        .agent-avatar {
          width: 24px;
          height: 24px;
          background: var(--primary-light);
          color: var(--primary);
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 0.7rem;
          font-weight: 700;
        }

        .date-text {
          color: var(--text-muted);
        }

        .action-btn {
          color: var(--text-muted);
          transition: color 0.2s;
        }

        .action-btn:hover {
          color: var(--primary);
        }

        .empty-state {
          text-align: center;
          padding: 4rem !important;
          color: var(--text-muted);
        }
      `}</style>
    </div>
  );
};

export default ComplaintList;
