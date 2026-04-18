import React from 'react';
import { Bell, Search, Info } from 'lucide-react';
import { useApp, ROLES } from '../context/AppContext';

const Navbar = () => {
  const { userRole, setUserRole } = useApp();

  return (
    <header className="navbar">
      <div className="search-bar">
        <Search size={18} />
        <input type="text" placeholder="Search complaints, IDs, or agents..." />
      </div>

      <div className="nav-actions">
        <div className="role-selector">
          <label htmlFor="role">Mock Role:</label>
          <select 
            id="role" 
            value={userRole} 
            onChange={(e) => setUserRole(e.target.value)}
          >
            {Object.values(ROLES).map(role => (
              <option key={role} value={role}>{role}</option>
            ))}
          </select>
        </div>

        <button className="icon-btn">
          <Bell size={20} />
          <span className="notification-dot"></span>
        </button>
        
        <button className="icon-btn">
          <Info size={20} />
        </button>
      </div>

      <style jsx>{`
        .navbar {
          height: var(--header-height);
          background: white;
          border-bottom: 1px solid var(--border);
          padding: 0 2rem;
          display: flex;
          align-items: center;
          justify-content: space-between;
          position: sticky;
          top: 0;
          z-index: 10;
        }

        .search-bar {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          background: #f1f5f9;
          padding: 0.5rem 1rem;
          border-radius: var(--radius-md);
          width: 380px;
          color: var(--text-muted);
        }

        .search-bar input {
          border: none;
          background: transparent;
          width: 100%;
          outline: none;
          font-size: 0.875rem;
        }

        .nav-actions {
          display: flex;
          align-items: center;
          gap: 1.5rem;
        }

        .role-selector {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          font-size: 0.875rem;
          font-weight: 500;
        }

        .role-selector select {
          padding: 0.375rem 0.75rem;
          border-radius: var(--radius-sm);
          border: 1px solid var(--border);
          background: white;
          font-size: 0.75rem;
        }

        .icon-btn {
          background: transparent;
          border: none;
          color: var(--text-muted);
          position: relative;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 0.5rem;
          border-radius: 50%;
          transition: background 0.2s;
        }

        .icon-btn:hover {
          background: #f1f5f9;
          color: var(--primary);
        }

        .notification-dot {
          position: absolute;
          top: 8px;
          right: 8px;
          width: 8px;
          height: 8px;
          background: var(--danger);
          border: 2px solid white;
          border-radius: 50%;
        }
      `}</style>
    </header>
  );
};

export default Navbar;
