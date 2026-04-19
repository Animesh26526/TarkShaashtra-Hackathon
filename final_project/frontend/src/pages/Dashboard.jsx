import React, { useEffect, useState } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line, Legend
} from 'recharts';
import { 
  Users, AlertCircle, Clock, CheckCircle2, TrendingUp,
  ArrowUpRight, ArrowDownRight, ShieldAlert, Loader2
} from 'lucide-react';
import { useApp } from '../context/AppContext';

const Dashboard = () => {
  const { complaints, stats, fetchStats } = useApp();
  const [liveStats, setLiveStats] = useState(null);

  useEffect(() => {
    fetchStats();
    const interval = setInterval(fetchStats, 30000);
    return () => clearInterval(interval);
  }, []);

  const s = stats || {};

  const categoryData = [
    { name: 'Product', value: s.categories?.Product || 0 },
    { name: 'Packaging', value: s.categories?.Packaging || 0 },
    { name: 'Trade', value: s.categories?.Trade || 0 },
  ];

  const priorityData = [
    { name: 'High', count: s.priorities?.High || 0 },
    { name: 'Medium', count: s.priorities?.Medium || 0 },
    { name: 'Low', count: s.priorities?.Low || 0 },
  ];

  // Generate resolution time data from actual complaints
  const resolutionData = complaints
    .filter(c => c.resolutionTime)
    .slice(0, 15)
    .map(c => ({ name: c.id, hours: c.resolutionTime }));

  const COLORS = ['#1d4ed8', '#0ea5e9', '#6366f1'];
  const PRIORITY_COLORS = { High: '#ef4444', Medium: '#f59e0b', Low: '#10b981' };

  const statCards = [
    { title: 'Total Complaints', value: s.total || complaints.length, icon: Users, color: 'var(--primary)', trend: `${complaints.length} total`, up: true },
    { title: 'Open Cases', value: s.open || 0, icon: AlertCircle, color: 'var(--danger)', trend: 'Needs attention', up: false },
    { title: 'Resolved', value: s.resolved || 0, icon: CheckCircle2, color: 'var(--success)', trend: 'Completed', up: true },
    { title: 'Avg. Resolution', value: (s.avgResolutionTime || 0) + 'h', icon: Clock, color: 'var(--accent)', trend: 'Average hours', up: false },
    { title: 'SLA Breached', value: s.slaBreached || 0, icon: ShieldAlert, color: '#dc2626', trend: 'Overdue', up: false },
    { title: 'Escalated', value: s.escalated || 0, icon: AlertCircle, color: '#7c3aed', trend: 'Needs escalation', up: false },
    { title: 'In Progress', value: s.inProgress || 0, icon: Loader2, color: 'var(--warning)', trend: 'Being worked on', up: true },
    { title: 'High Priority Open', value: s.slaAtRisk || 0, icon: AlertCircle, color: '#dc2626', trend: 'At risk', up: false },
  ];

  return (
    <div className="dashboard">
      <div className="dashboard-header">
        <div>
          <h1>Operations Overview</h1>
          <p>Real-time analytics for <span className="brand-black">Resolvo</span> complaint management.</p>
        </div>
        <div className="time-filter">
          <TrendingUp size={16} />
          <span>Live Data</span>
        </div>
      </div>

      <div className="stats-grid">
        {statCards.map((stat, idx) => (
          <div key={idx} className="card stat-card">
            <div className="stat-content">
              <p className="stat-title">{stat.title}</p>
              <h3 className="stat-value">{stat.value}</h3>
              <div className={`stat-trend ${stat.up ? 'trend-up' : 'trend-down'}`}>
                {stat.up ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
                <span>{stat.trend}</span>
              </div>
            </div>
            <div className="stat-icon" style={{ background: `${stat.color}15`, color: stat.color }}>
              <stat.icon size={24} />
            </div>
          </div>
        ))}
      </div>

      <div className="charts-grid">
        <div className="card chart-card wide">
          <div className="chart-header">
            <h3>Resolution Time by Complaint</h3>
            <p>Hours to resolve each complaint.</p>
          </div>
          <div className="chart-container">
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={resolutionData.length ? resolutionData : [{ name: '--', hours: 0 }]}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 11}} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12}} />
                <Tooltip 
                  contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                />
                <Bar dataKey="hours" radius={[6, 6, 0, 0]} barSize={24}>
                  {resolutionData.map((entry, index) => (
                    <Cell key={index} fill={entry.hours > 48 ? '#fecdd3' : entry.hours > 24 ? '#fde68a' : '#bfdbfe'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="card chart-card">
          <div className="chart-header">
            <h3>Category Distribution</h3>
            <p>Product / Packaging / Trade</p>
          </div>
          <div className="chart-container central">
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie
                  data={categoryData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {categoryData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend iconType="circle" wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="card chart-card">
          <div className="chart-header">
            <h3>Priority Distribution</h3>
            <p>High / Medium / Low</p>
          </div>
          <div className="chart-container">
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={priorityData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                <XAxis type="number" hide />
                <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12}} width={60} />
                <Tooltip cursor={{fill: '#f1f5f9'}} />
                <Bar dataKey="count" radius={[0, 6, 6, 0]} barSize={24}>
                  {priorityData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={PRIORITY_COLORS[entry.name]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <style>{`
        .dashboard { display: flex; flex-direction: column; gap: 2rem; }
        .dashboard-header { display: flex; justify-content: space-between; align-items: flex-end; }
        .dashboard-header h1 { font-size: 1.875rem; font-weight: 700; color: var(--text-main); margin-bottom: 0.25rem; }
        .dashboard-header p { color: var(--text-muted); }
        .time-filter { display: flex; align-items: center; gap: 0.5rem; background: white; padding: 0.5rem 1rem; border-radius: var(--radius-md); border: 1px solid var(--border); font-size: 0.875rem; font-weight: 500; color: var(--success); }
        .stats-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 1.25rem; }
        .stat-card { display: flex; justify-content: space-between; align-items: center; padding: 1.25rem; }
        .stat-title { font-size: 0.8rem; color: var(--text-muted); font-weight: 500; margin-bottom: 0.375rem; }
        .stat-value { font-size: 1.5rem; font-weight: 700; margin-bottom: 0.375rem; }
        .stat-trend { display: flex; align-items: center; gap: 0.25rem; font-size: 0.7rem; font-weight: 600; }
        .trend-up { color: var(--success); }
        .trend-down { color: var(--danger); }
        .stat-icon { width: 48px; height: 48px; border-radius: 12px; display: flex; align-items: center; justify-content: center; }
        .charts-grid { display: grid; grid-template-columns: 2fr 1fr; grid-template-rows: auto auto; gap: 1.5rem; }
        .chart-card.wide { grid-column: span 1; }
        .chart-card { padding: 1.5rem; }
        .chart-header { margin-bottom: 1.5rem; }
        .chart-header h3 { font-size: 1rem; font-weight: 600; margin-bottom: 0.25rem; }
        .chart-header p { font-size: 0.8rem; color: var(--text-muted); }
        .brand-black { color: #000000; font-weight: 600; }
        .chart-container { width: 100%; }
        .chart-container.central { display: flex; justify-content: center; }
      `}</style>
    </div>
  );
};

export default Dashboard;
