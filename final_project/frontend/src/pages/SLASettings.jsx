import React, { useState, useEffect, useMemo } from 'react';
import { Clock, Save, AlertCircle, CheckCircle2 } from 'lucide-react';
import { useApp } from '../context/AppContext';

const SLASettings = () => {
  const { complaints } = useApp();
  const [sla, setSla] = useState({ High: 24, Medium: 48, Low: 72 });
  const [saveMsg, setSaveMsg] = useState('');

  useEffect(() => {
    fetch('/api/sla-settings')
      .then(r => r.json())
      .then(data => setSla(data))
      .catch(() => {});
  }, []);

  const saveSLA = async () => {
    try {
      await fetch('/api/sla-settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(sla)
      });
      setSaveMsg('SLA settings saved successfully.');
      setTimeout(() => setSaveMsg(''), 3000);
    } catch (e) {
      setSaveMsg('Failed to save settings.');
    }
  };

  const openComplaints = useMemo(() => {
    return complaints.filter(c => c.status !== 'Resolved');
  }, [complaints]);

  return (
    <div className="sla-settings-page">
      <div className="sla-header">
        <div>
          <h1>SLA Time Settings</h1>
          <p>Configure service-level agreement deadlines by priority level.</p>
        </div>
      </div>

      <div className="card sla-config-card">
        <div className="sla-grid">
          {[
            { key: 'High', color: '#dc2626', border: '#fecdd3', desc: 'Critical complaints requiring immediate attention.' },
            { key: 'Medium', color: '#d97706', border: '#fde68a', desc: 'Standard complaints with moderate urgency.' },
            { key: 'Low', color: '#1d4ed8', border: '#bfdbfe', desc: 'General inquiries and minor issues.' },
          ].map(item => (
            <div key={item.key} className="sla-card card" style={{ borderColor: item.border }}>
              <h4 style={{ color: item.color }}>{item.key} Priority</h4>
              <p className="sla-desc">{item.desc}</p>
              <div className="sla-input-group">
                <input 
                  type="number" 
                  value={sla[item.key]} 
                  onChange={e => setSla(prev => ({ ...prev, [item.key]: parseInt(e.target.value) || 0 }))}
                  min={1} max={168}
                />
                <span>hours</span>
              </div>
            </div>
          ))}
        </div>

        <div className="save-area">
          <button className="btn btn-primary" onClick={saveSLA}>
            <Save size={16} /> Save SLA Settings
          </button>
          {saveMsg && <p className="save-msg">{saveMsg}</p>}
        </div>
      </div>

      <div className="card compliance-card">
        <h3>Current SLA Compliance</h3>
        <div className="table-wrapper">
          <table className="data-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Title</th>
                <th>Priority</th>
                <th>SLA Deadline</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {openComplaints.map(c => {
                const dl = c.slaDeadline ? new Date(c.slaDeadline) : null;
                const overdue = dl && dl < new Date();
                return (
                  <tr key={c.id}>
                    <td><span className="id-tag">{c.id}</span></td>
                    <td>{c.title}</td>
                    <td><span className={`badge priority-${(c.priority || 'low').toLowerCase()}`}>{c.priority}</span></td>
                    <td style={{ color: overdue ? '#dc2626' : 'inherit', fontWeight: overdue ? 700 : 400 }}>
                      {dl ? dl.toLocaleString() : '--'}
                      {overdue && ' (OVERDUE)'}
                    </td>
                    <td>{c.status}</td>
                  </tr>
                );
              })}
              {openComplaints.length === 0 && (
                <tr><td colSpan={5} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>No open complaints.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <style>{`
        .sla-settings-page { display: flex; flex-direction: column; gap: 1.5rem; }
        .sla-header h1 { font-size: 1.875rem; font-weight: 700; margin-bottom: 0.25rem; }
        .sla-header p { color: var(--text-muted); }
        .sla-config-card { padding: 2rem; }
        .sla-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 1.5rem; margin-bottom: 2rem; }
        .sla-card { padding: 1.5rem; border-width: 2px; }
        .sla-card h4 { font-size: 1rem; font-weight: 700; margin-bottom: 0.5rem; }
        .sla-desc { font-size: 0.8rem; color: var(--text-muted); margin-bottom: 1rem; line-height: 1.5; }
        .sla-input-group { display: flex; align-items: center; gap: 0.5rem; }
        .sla-input-group input { width: 80px; padding: 0.5rem; border: 1px solid var(--border); border-radius: var(--radius-md); font-size: 1.125rem; font-weight: 700; text-align: center; }
        .sla-input-group span { font-size: 0.85rem; color: var(--text-muted); }
        .save-area { text-align: center; }
        .btn { display: inline-flex; align-items: center; gap: 0.5rem; padding: 0.75rem 1.5rem; border-radius: var(--radius-md); font-weight: 600; border: none; cursor: pointer; }
        .btn-primary { background: var(--primary); color: white; }
        .btn-primary:hover { background: #1e40af; }
        .save-msg { margin-top: 0.75rem; color: var(--success); font-weight: 600; }

        .compliance-card { padding: 1.5rem; }
        .compliance-card h3 { font-size: 1rem; font-weight: 700; margin-bottom: 1rem; }
        .table-wrapper { overflow-x: auto; }
        .data-table { width: 100%; border-collapse: collapse; font-size: 0.85rem; }
        .data-table th { font-size: 0.7rem; font-weight: 700; text-transform: uppercase; color: var(--text-muted); padding: 0.75rem; text-align: left; border-bottom: 1px solid var(--border); }
        .data-table td { padding: 0.75rem; border-bottom: 1px solid #f1f5f9; }
        .id-tag { font-family: monospace; font-size: 0.75rem; padding: 0.2rem 0.5rem; background: #f1f5f9; border-radius: 4px; font-weight: 600; }
        .badge { padding: 0.2rem 0.75rem; border-radius: 9999px; font-size: 0.7rem; font-weight: 700; }
        .priority-high { background: #fee2e2; color: #991b1b; }
        .priority-medium { background: #fef3c7; color: #92400e; }
        .priority-low { background: #d1fae5; color: #065f46; }
      `}</style>
    </div>
  );
};

export default SLASettings;
