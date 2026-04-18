import React from 'react';
import { NavLink } from 'react-router-dom';
import { 
  BarChart3, 
  MessageSquare, 
  AlertCircle, 
  Settings, 
  LogOut, 
  PlusCircle,
  FileText,
  User,
  ShieldCheck
} from 'lucide-react';
import { useApp } from '../context/AppContext';

const Sidebar = () => {
  const { userRole } = useApp();

  const navItems = [
    { name: 'Dashboard', path: '/operational-dashboard', icon: BarChart3, roles: ['Operations Manager'] },
    { name: 'Complaints', path: '/complaints', icon: MessageSquare, roles: ['Operations Manager', 'Support Executive', 'QA Team'] },
    { name: 'New Complaint', path: '/customer-dashboard', icon: PlusCircle, roles: ['Customer'] },
    // Removed My History for Customers to minimize list-view clutter as requested
    { name: 'Quality Check', path: '/qa', icon: ShieldCheck, roles: ['QA Team'] },
  ];

  const filteredItems = navItems.filter(item => item.roles.includes(userRole));

  return (
    <aside className="sidebar">
      <div className="sidebar-brand">
        <div className="brand-icon">R</div>
        <div className="brand-text">
          <span className="name">Resolv<span className="highlight">o</span></span>
          <span className="tagline">Smart Complaint Resolution Platform</span>
        </div>
      </div>
      
      <nav className="sidebar-nav">
        <p className="nav-label">Main Menu</p>
        <ul>
          {filteredItems.map(item => (
            <li key={item.path}>
              <NavLink to={item.path} className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}>
                <item.icon size={20} />
                <span>{item.name}</span>
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>

      <div className="sidebar-footer">
        <div className="user-profile">
          <div className="avatar">
            <User size={18} />
          </div>
          <div className="user-info">
            <p className="user-name">{userRole}</p>
            <p className="user-status">Online</p>
          </div>
        </div>
        <button className="logout-btn">
          <LogOut size={18} />
          <span>Exit</span>
        </button>
      </div>

      <style jsx>{`
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
          color: #000000;
        }

        .highlight {
          color: #000000;
        }

        .tagline {
          font-size: 0.625rem;
          color: var(--text-muted);
          font-weight: 500;
          margin-top: -2px;
        }

        .brand-icon {
          width: 32px;
          height: 32px;
          background: var(--primary);
          color: white;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 8px;
          font-family: serif;
          flex-shrink: 0;
        }

        .sidebar-nav {
          flex: 1;
          padding: 0 1rem;
        }

        .nav-label {
          font-size: 0.75rem;
          text-transform: uppercase;
          color: var(--text-muted);
          font-weight: 600;
          letter-spacing: 0.05em;
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
          transition: all 0.2s;
        }

        .nav-link:hover {
          background: var(--primary-light);
          color: var(--primary);
        }

        .nav-link.active {
          background: var(--primary-light);
          color: var(--primary);
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
          font-size: 0.875rem;
          font-weight: 600;
        }

        .user-status {
          font-size: 0.75rem;
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
        }

        .logout-btn:hover {
          background: #fee2e2;
          color: #991b1b;
          border-color: #fecaca;
        }
      `}</style>
    </aside>
  );
};

export default Sidebar;
