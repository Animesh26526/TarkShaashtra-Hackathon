import React from 'react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  Legend
} from 'recharts';
import { 
  Users, 
  AlertCircle, 
  Clock, 
  CheckCircle2,
  TrendingUp,
  ArrowUpRight,
  ArrowDownRight
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import TrendChart from '../components/TrendChart';

const Dashboard = () => {
  const { complaints, isLoading } = useApp();

  // Data processing for charts
  const categoryData = [
    { name: 'Product Issue', value: complaints.filter(c => c.category === 'Product Issue').length },
    { name: 'Packaging Issue', value: complaints.filter(c => c.category === 'Packaging Issue').length },
    { name: 'Trade Inquiry', value: complaints.filter(c => c.category === 'Trade Inquiry').length },
  ];

  const priorityData = [
    { name: 'High', count: complaints.filter(c => c.priority === 'High').length },
    { name: 'Medium', count: complaints.filter(c => c.priority === 'Medium').length },
    { name: 'Low', count: complaints.filter(c => c.priority === 'Low').length },
  ];

  // Removed static trendData - now handled by TrendChart component

  const COLORS = ['#1d4ed8', '#0ea5e9', '#6366f1'];
  const PRIORITY_COLORS = { High: '#ef4444', Medium: '#f59e0b', Low: '#10b981' };

  const stats = [
    { title: 'Total Complaints', value: complaints.length, icon: Users, color: 'var(--primary)', trend: '+12%', up: true },
    { title: 'SLA At Risk', value: complaints.filter(c => c.priority === 'High' && c.status === 'Open').length, icon: AlertCircle, color: 'var(--danger)', trend: '-2%', up: false },
    { title: 'Resolved Today', value: complaints.filter(c => c.status === 'Resolved').length, icon: CheckCircle2, color: 'var(--success)', trend: '+5%', up: true },
    { title: 'Avg. Resolution', value: '18h', icon: Clock, color: 'var(--accent)', trend: '-15%', up: false },
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
          <span>Last 7 Days</span>
        </div>
      </div>

      <div className="stats-grid">
        {stats.map((stat, idx) => (
          <div key={idx} className="card stat-card">
            <div className="stat-content">
              <p className="stat-title">{stat.title}</p>
              <h3 className="stat-value">{stat.value}</h3>
              <div className={`stat-trend ${stat.up ? 'trend-up' : 'trend-down'}`}>
                {stat.up ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
                <span>{stat.trend} from last week</span>
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
            <h3>Complaint Volume Trend</h3>
            <p>Number of daily complaints received.</p>
          </div>
          <div className="chart-container">
            <TrendChart data={complaints} isLoading={isLoading} period="day" />
          </div>
        </div>

        <div className="card chart-card">
          <div className="chart-header">
            <h3>Category Mix</h3>
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
          </div>
          <div className="chart-container">
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={priorityData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                <XAxis type="number" hide />
                <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12}} width={60} />
                <Tooltip cursor={{fill: '#f1f5f9'}} />
                <Bar dataKey="count" radius={[0, 4, 4, 0]} barSize={20}>
                  {priorityData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={PRIORITY_COLORS[entry.name]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <style jsx>{`
        .dashboard {
          display: flex;
          flex-direction: column;
          gap: 2rem;
        }

        .dashboard-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-end;
        }

        .dashboard-header h1 {
          font-size: 1.875rem;
          font-weight: 700;
          color: var(--text-main);
          margin-bottom: 0.25rem;
        }

        .dashboard-header p {
          color: var(--text-muted);
        }

        .time-filter {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          background: white;
          padding: 0.5rem 1rem;
          border-radius: var(--radius-md);
          border: 1px solid var(--border);
          font-size: 0.875rem;
          font-weight: 500;
          color: var(--text-muted);
        }

        .stats-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 1.5rem;
        }

        .stat-card {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 1.5rem;
        }

        .stat-title {
          font-size: 0.875rem;
          color: var(--text-muted);
          font-weight: 500;
          margin-bottom: 0.5rem;
        }

        .stat-value {
          font-size: 1.5rem;
          font-weight: 700;
          margin-bottom: 0.5rem;
        }

        .stat-trend {
          display: flex;
          align-items: center;
          gap: 0.25rem;
          font-size: 0.75rem;
          font-weight: 600;
        }

        .trend-up { color: var(--success); }
        .trend-down { color: var(--danger); }

        .stat-icon {
          width: 48px;
          height: 48px;
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .charts-grid {
          display: grid;
          grid-template-columns: 2fr 1fr;
          grid-template-rows: auto auto;
          gap: 1.5rem;
        }

        .chart-card.wide {
          grid-column: span 1;
        }

        .chart-card {
          padding: 1.5rem;
        }

        .chart-header {
          margin-bottom: 1.5rem;
        }

        .chart-header h3 {
          font-size: 1.125rem;
          font-weight: 600;
          margin-bottom: 0.25rem;
        }

        .chart-header p {
          font-size: 0.875rem;
          color: var(--text-muted);
        }

        .brand-black {
          color: #000000;
          font-weight: 600;
        }

        .chart-container {
          width: 100%;
        }

        .chart-container.central {
          display: flex;
          justify-content: center;
        }
      `}</style>
    </div>
  );
};

export default Dashboard;
