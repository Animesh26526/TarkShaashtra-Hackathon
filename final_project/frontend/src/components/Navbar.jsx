import React, { useState, useEffect } from 'react';
import { Bell, Search, Settings as SettingsIcon, Moon, Sun, Info, X } from 'lucide-react';
import { useApp } from '../context/AppContext';

const Navbar = () => {
  const { userRole } = useApp();
  const [showSettings, setShowSettings] = useState(false);
  const [showInfoBar, setShowInfoBar] = useState(false);
  const [sessionTime, setSessionTime] = useState(0);
  const [isDarkMode, setIsDarkMode] = useState(() => {
    return localStorage.getItem('dark_mode') === 'true';
  });

  useEffect(() => {
    if (isDarkMode) {
      document.body.classList.add('dark-theme');
      localStorage.setItem('dark_mode', 'true');
    } else {
      document.body.classList.remove('dark-theme');
      localStorage.setItem('dark_mode', 'false');
    }
  }, [isDarkMode]);

  // Track session time
  useEffect(() => {
    const interval = setInterval(() => {
      setSessionTime(prev => prev + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const formatTime = (seconds) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    if (h > 0) return `${h}h ${m}m ${s}s`;
    if (m > 0) return `${m}m ${s}s`;
    return `${s}s`;
  };

  return (
    <>
      {showInfoBar && (
        <div className="info-bar-overlay" onClick={() => setShowInfoBar(false)}>
          <div className="info-bar-popup" onClick={e => e.stopPropagation()}>
            <button className="info-close" onClick={() => setShowInfoBar(false)}>
              <X size={16} />
            </button>
            <div className="info-bar-header">
              <div className="info-brand-icon">R</div>
              <div>
                <h3>Resolvo</h3>
                <p className="info-tagline">AI-Powered Complaint Resolution</p>
              </div>
            </div>

            <div className="info-section">
              <h4>🤖 AI Models Used</h4>
              <div className="model-chips">
                <span className="model-chip">Gemma 4 27B IT</span>
                <span className="model-chip">Gemma 4 31B IT</span>
                <span className="model-chip accent">Gemini 3.1 Flash Live</span>
              </div>
            </div>

            <div className="info-section">
              <h4>⏱️ Session Duration</h4>
              <div className="session-timer">{formatTime(sessionTime)}</div>
            </div>

            <div className="info-section">
              <h4>🛠️ Tech Stack</h4>
              <div className="model-chips">
                <span className="model-chip">React + Vite</span>
                <span className="model-chip">Appwrite</span>
                <span className="model-chip">Flask API</span>
              </div>
            </div>

            <div className="info-footer">
              <p>Made by <strong>kyunahihorahicoding</strong></p>
              <p className="hackathon-badge">🏆 Tarkshastra Hackathon · LDCE · 2026</p>
            </div>
          </div>
        </div>
      )}

      <header className="navbar">
        <div className="nav-search">
          <Search size={18} />
          <input type="text" placeholder="Search complaints, IDs, or categories..." />
        </div>

        <div className="nav-actions">
          <button className="icon-btn info-trigger" onClick={() => setShowInfoBar(!showInfoBar)} title="About Resolvo">
            <Info size={18} />
          </button>

          <div style={{ position: 'relative' }}>
            <button className="icon-btn" onClick={() => setShowSettings(!showSettings)}>
              <SettingsIcon size={18} />
            </button>
            
            {showSettings && (
              <div className="settings-popup card">
                <div className="settings-item" onClick={() => setIsDarkMode(!isDarkMode)}>
                  {isDarkMode ? <Sun size={16} /> : <Moon size={16} />}
                  <span>{isDarkMode ? 'Light Mode' : 'Dark Mode'}</span>
                </div>
              </div>
            )}
          </div>

          <button className="notification-btn">
            <Bell size={18} />
            <span className="notification-dot" />
          </button>
        </div>

      <style>{`
        .navbar {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 1rem 2rem;
          background: var(--bg-card);
          border-bottom: 1px solid var(--border);
          position: sticky;
          top: 0;
          z-index: 10;
        }

        .nav-search {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          background: var(--bg-main);
          padding: 0.625rem 1rem;
          border-radius: var(--radius-md);
          border: 1px solid var(--border);
          width: 400px;
          color: var(--text-muted);
        }

        .nav-search input {
          border: none;
          outline: none;
          background: transparent;
          font-size: 0.875rem;
          width: 100%;
          color: var(--text-main);
        }

        .nav-actions {
          display: flex;
          align-items: center;
          gap: 1.5rem;
        }

        .icon-btn,
        .notification-btn {
          position: relative;
          width: 40px;
          height: 40px;
          border-radius: 50%;
          border: 1px solid var(--border);
          background: var(--bg-card);
          display: flex;
          align-items: center;
          justify-content: center;
          color: var(--text-muted);
          cursor: pointer;
          transition: all 0.2s;
        }

        .icon-btn:hover,
        .notification-btn:hover {
          background: var(--primary-light);
          color: var(--primary);
        }

        .info-trigger {
          animation: info-glow 3s ease-in-out infinite;
        }
        @keyframes info-glow {
          0%, 100% { box-shadow: none; }
          50% { box-shadow: 0 0 8px rgba(99, 102, 241, 0.3); }
        }

        .settings-popup {
          position: absolute;
          top: 100%;
          right: 0;
          margin-top: 0.5rem;
          width: 180px;
          padding: 0.5rem;
          display: flex;
          flex-direction: column;
          z-index: 50;
        }

        .settings-item {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          padding: 0.75rem;
          border-radius: var(--radius-sm);
          cursor: pointer;
          font-size: 0.875rem;
          color: var(--text-main);
          transition: background 0.2s;
        }

        .settings-item:hover {
          background: var(--primary-light);
          color: var(--primary);
        }

        .notification-dot {
          position: absolute;
          top: 8px;
          right: 8px;
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: var(--danger);
        }

        /* ── Info Bar Popup ── */
        .info-bar-overlay {
          position: fixed;
          top: 0; left: 0; right: 0; bottom: 0;
          background: rgba(0,0,0,0.5);
          backdrop-filter: blur(4px);
          z-index: 1000;
          display: flex;
          align-items: center;
          justify-content: center;
          animation: fadeIn 0.2s ease;
        }
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }

        .info-bar-popup {
          background: var(--bg-card, #fff);
          border-radius: 20px;
          padding: 2rem 2.5rem;
          max-width: 420px;
          width: 90%;
          box-shadow: 0 20px 60px rgba(0,0,0,0.3);
          position: relative;
          animation: slideUp 0.3s ease;
        }
        @keyframes slideUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }

        .info-close {
          position: absolute;
          top: 1rem; right: 1rem;
          background: none; border: none;
          color: var(--text-muted);
          cursor: pointer;
          padding: 4px;
          border-radius: 50%;
          transition: all 0.2s;
        }
        .info-close:hover { background: var(--primary-light); color: var(--primary); }

        .info-bar-header {
          display: flex;
          align-items: center;
          gap: 1rem;
          margin-bottom: 1.5rem;
        }
        .info-brand-icon {
          width: 48px; height: 48px;
          background: linear-gradient(135deg, #6366f1, #0ea5e9);
          color: white;
          display: flex; align-items: center; justify-content: center;
          border-radius: 14px;
          font-family: serif;
          font-weight: 700;
          font-size: 1.4rem;
          box-shadow: 0 4px 20px rgba(99, 102, 241, 0.4);
        }
        .info-bar-header h3 {
          font-size: 1.25rem;
          font-weight: 700;
          color: var(--text-main);
          margin: 0;
        }
        .info-tagline {
          color: var(--text-muted);
          font-size: 0.8rem;
          margin: 0;
        }

        .info-section {
          margin-bottom: 1.25rem;
        }
        .info-section h4 {
          font-size: 0.8rem;
          font-weight: 600;
          color: var(--text-muted);
          margin-bottom: 0.5rem;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }

        .model-chips {
          display: flex;
          flex-wrap: wrap;
          gap: 0.5rem;
        }
        .model-chip {
          padding: 0.35rem 0.75rem;
          border-radius: 20px;
          font-size: 0.75rem;
          font-weight: 600;
          background: var(--primary-light, #eff6ff);
          color: var(--primary, #1d4ed8);
          border: 1px solid rgba(99, 102, 241, 0.2);
        }
        .model-chip.accent {
          background: linear-gradient(135deg, rgba(99, 102, 241, 0.15), rgba(14, 165, 233, 0.15));
          border-color: rgba(14, 165, 233, 0.3);
          color: #0ea5e9;
        }

        .session-timer {
          font-size: 1.75rem;
          font-weight: 700;
          background: linear-gradient(135deg, #6366f1, #0ea5e9);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
          font-variant-numeric: tabular-nums;
        }

        .info-footer {
          margin-top: 1.5rem;
          padding-top: 1rem;
          border-top: 1px solid var(--border);
          text-align: center;
        }
        .info-footer p {
          color: var(--text-muted);
          font-size: 0.8rem;
          margin: 0.25rem 0;
        }
        .info-footer strong {
          color: var(--text-main);
        }
        .hackathon-badge {
          margin-top: 0.5rem !important;
          padding: 0.4rem 1rem;
          background: linear-gradient(135deg, rgba(99, 102, 241, 0.1), rgba(14, 165, 233, 0.1));
          border-radius: 20px;
          display: inline-block;
          font-weight: 600;
          color: var(--primary) !important;
          border: 1px solid rgba(99, 102, 241, 0.2);
        }
      `}</style>
    </header>
    </>
  );
};

export default Navbar;
