import React, { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { 
  BarChart3, 
  MessageSquare, 
  Settings, 
  LogOut, 
  PlusCircle,
  User,
  ShieldCheck,
  ClipboardCheck,
  Download,
  Clock,
  FileSearch
} from 'lucide-react';
import { useApp, ROLES } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';

const Sidebar = () => {
  const { userRole, setUserRole } = useApp();
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [showAccountSwitch, setShowAccountSwitch] = useState(false);

  const navItems = [
    // Operations Manager
    { name: 'Dashboard', path: '/operational-dashboard', icon: BarChart3, roles: [ROLES.MANAGER] },
    { name: 'All Complaints', path: '/complaints', icon: MessageSquare, roles: [ROLES.MANAGER] },
    { name: 'SLA Settings', path: '/ops/sla', icon: Clock, roles: [ROLES.MANAGER] },
    { name: 'Backup & Export', path: '/ops/export', icon: Download, roles: [ROLES.MANAGER] },

    // Customer Support Executive
    { name: 'Terminal / Submit', path: '/submit', icon: PlusCircle, roles: [ROLES.EXECUTIVE] },

    // Quality Assurance Team
    { name: 'Quality Analysis', path: '/complaints', icon: ClipboardCheck, roles: [ROLES.QA] },
    { name: 'AI Re-Review', path: '/qa/review', icon: FileSearch, roles: [ROLES.QA] },
  ];

  const filteredItems = navItems.filter(item => item.roles.includes(userRole));

  return (
    <aside className="sidebar">
      <div className="sidebar-brand">
        <div className="brand-icon">R</div>
        <div className="brand-text">
          <span className="name">Resolv<span className="highlight">o</span></span>
          <span className="tagline">AI Complaint Resolution Engine</span>
        </div>
      </div>
      
      <nav className="sidebar-nav">
        <p className="nav-label">Main Menu</p>
        <ul>
          {filteredItems.map(item => (
            <li key={item.name}>
              <NavLink to={item.path} className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}>
                <item.icon size={20} />
                <span>{item.name}</span>
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>

      <div className="sidebar-footer">
        <div style={{ position: 'relative' }}>
          <div className="user-profile" onClick={() => setShowAccountSwitch(!showAccountSwitch)} style={{ cursor: 'pointer' }}>
            <div className="avatar">
              <User size={18} />
            </div>
            <div className="user-info">
              <p className="user-name">{user?.name || userRole}</p>
              <p className="user-status">Online</p>
            </div>
          </div>
          
          {showAccountSwitch && (
            <div className="account-switch-popup card">
              <div className="popup-header">Switch Account</div>
              <div className="account-option" onClick={() => { setUserRole(ROLES.EXECUTIVE); setShowAccountSwitch(false); }}>Support Executive</div>
              <div className="account-option" onClick={() => { setUserRole(ROLES.QA); setShowAccountSwitch(false); }}>QA Team</div>
              <div className="account-option" onClick={() => { setUserRole(ROLES.MANAGER); setShowAccountSwitch(false); }}>Operations Manager</div>
            </div>
          )}
        </div>
        
        <button className="logout-btn" style={{ marginTop: '0.5rem' }} onClick={async () => {
          await logout();
          navigate('/login');
        }}>
          <LogOut size={18} />
          <span>Sign Out</span>
        </button>
      </div>

      <style>{`
        .sidebar {
          width: var(--sidebar-width);
          height: 100vh;
          background: var(--bg-sidebar);
          border-right: 1px solid var(--border);
          display: flex;
          flex-direction: column;
          position: sticky;
          top: 0;
        }

        .sidebar-brand {
          padding: 1.5rem 1.5rem;
          display: flex;
          align-items: center;
          gap: 0.75rem;
          color: var(--text-main);
        }

        .brand-text {
          display: flex;
          flex-direction: column;
        }

        .name {
          font-weight: 700;
          font-size: 1.25rem;
          letter-spacing: -0.02em;
          color: var(--text-main);
        }

        .highlight {
          color: var(--primary);
        }

        .tagline {
          font-size: 0.6rem;
          color: var(--text-muted);
          font-weight: 500;
          margin-top: -2px;
          text-transform: uppercase;
          letter-spacing: 0.03em;
        }

        .brand-icon {
          width: 36px;
          height: 36px;
          background: linear-gradient(135deg, var(--primary), var(--accent));
          color: white;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 10px;
          font-family: serif;
          font-weight: 700;
          font-size: 1.1rem;
          flex-shrink: 0;
          box-shadow: 0 4px 12px rgba(29, 78, 216, 0.25);
        }

        .sidebar-nav {
          flex: 1;
          padding: 0 1rem;
          overflow-y: auto;
        }

        .nav-label {
          font-size: 0.7rem;
          text-transform: uppercase;
          color: var(--text-muted);
          font-weight: 600;
          letter-spacing: 0.08em;
          margin: 1.5rem 0.5rem 0.75rem;
        }

        .nav-link {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          padding: 0.75rem 0.75rem;
          border-radius: var(--radius-md);
          color: var(--text-muted);
          font-weight: 500;
          font-size: 0.875rem;
          transition: all 0.2s;
        }

        .nav-link:hover {
          background: var(--primary-light);
          color: var(--primary);
        }

        .nav-link.active {
          background: var(--primary-light);
          color: var(--primary);
          font-weight: 600;
        }

        .sidebar-footer {
          padding: 1.5rem;
          border-top: 1px solid var(--border);
        }

        .user-profile {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          margin-bottom: 1rem;
        }

        .avatar {
          width: 36px;
          height: 36px;
          background: var(--primary-light);
          color: var(--primary);
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .user-info p {
          margin: 0;
        }

        .user-name {
          font-size: 0.8rem;
          font-weight: 600;
        }

        .user-status {
          font-size: 0.7rem;
          color: var(--success);
        }

        .logout-btn {
          width: 100%;
          display: flex;
          align-items: center;
          gap: 0.75rem;
          padding: 0.625rem;
          border-radius: var(--radius-md);
          border: 1px solid var(--border);
          background: transparent;
          color: var(--text-muted);
          font-weight: 500;
          font-size: 0.875rem;
          text-decoration: none;
          transition: all 0.2s;
        }

        .logout-btn:hover {
          background: #fee2e2;
          color: #991b1b;
          border-color: #fecaca;
        }

        .account-switch-popup {
          position: absolute;
          bottom: 100%;
          left: 0;
          width: 100%;
          margin-bottom: 0.5rem;
          padding: 0.5rem;
          display: flex;
          flex-direction: column;
          z-index: 50;
        }

        .popup-header {
          font-size: 0.7rem;
          text-transform: uppercase;
          color: var(--text-muted);
          font-weight: 600;
          padding: 0.5rem;
          margin-bottom: 0.25rem;
          border-bottom: 1px solid var(--border);
        }

        .account-option {
          padding: 0.75rem;
          border-radius: var(--radius-sm);
          cursor: pointer;
          font-size: 0.8rem;
          font-weight: 500;
          color: var(--text-main);
          transition: background 0.2s;
        }

        .account-option:hover {
          background: var(--primary-light);
          color: var(--primary);
        }
      `}</style>
    </aside>
  );
};

export default Sidebar;
