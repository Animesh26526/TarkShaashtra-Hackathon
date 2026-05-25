import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { motion } from 'framer-motion';
import { UserCheck, Shield, Award } from 'lucide-react';

const CompleteProfile = () => {
  const { completeProfile, user, checkSession, hasProfile } = useAuth();
  const navigate = useNavigate();
  const [role, setRole] = useState('Customer Support Executive'); // Default selected
  const [employeeId, setEmployeeId] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // On mount: refresh session, check if profile already exists
  useEffect(() => {
    const init = async () => {
      await checkSession();
    };
    init();
  }, []);

  // Redirect if user already has a profile
  useEffect(() => {
    if (user && hasProfile) {
      navigate('/', { replace: true });
    } else if (user) {
      setLoading(false);
    }
  }, [user, hasProfile]);

  const validateEmployeeId = (id) => {
    return /^EMP-\d{5}$/i.test(id.trim());
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!role) return setError('Please select a role.');
    if (!employeeId.trim()) return setError('Employee ID is required.');
    if (!validateEmployeeId(employeeId)) {
      return setError('Employee ID must follow the EMP-XXXXX format (e.g. EMP-12345).');
    }

    setLoading(true);
    try {
      await completeProfile({ role, employeeId: employeeId.trim() });
      navigate('/');
    } catch (err) {
      if (err.message === 'ROLE_ALREADY_LOCKED') {
        setError('Role is already set and cannot be changed.');
      } else {
        setError(err.message || 'Failed to save profile.');
      }
    } finally {
      setLoading(false);
    }
  };

  const rolesData = [
    {
      id: 'Customer Support Executive',
      title: 'Customer Support',
      subtitle: 'Executive',
      icon: UserCheck,
      color: '#6366f1',
      bgLight: 'rgba(99, 102, 241, 0.08)',
    },
    {
      id: 'Quality Assurance Team',
      title: 'QA Team',
      subtitle: 'Auditor',
      icon: Shield,
      color: '#0ea5e9',
      bgLight: 'rgba(14, 165, 233, 0.08)',
    },
    {
      id: 'Operations Manager',
      title: 'Operations',
      subtitle: 'Manager',
      icon: Award,
      color: '#f59e0b',
      bgLight: 'rgba(245, 158, 11, 0.08)',
    },
  ];

  if (loading) {
    return (
      <div className="auth-page">
        <div className="auth-container" style={{ textAlign: 'center' }}>
          <div style={{ width: 40, height: 40, margin: '0 auto', border: '3px solid #e2e8f0', borderTopColor: '#6366f1', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
          <p style={{ marginTop: '1rem', color: '#64748b' }}>Refreshing workspace details...</p>
        </div>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  return (
    <div className="auth-page">
      <motion.div 
        className="auth-container" 
        initial={{ opacity: 0, y: 30 }} 
        animate={{ opacity: 1, y: 0 }} 
        transition={{ duration: 0.5 }}
      >
        <div className="auth-brand">
          <div className="brand-icon-auth">R</div>
          <span className="brand-name-auth">Resolvo</span>
        </div>

        <h1>Complete Your Profile</h1>
        <p className="auth-subtitle">
          Welcome{user?.name ? `, ${user.name}` : ''}! Choose your portal role and enter your employee credentials.
        </p>

        {/* Role Selector Cards */}
        <div className="login-role-selector" style={{ marginBottom: '1.5rem' }}>
          {rolesData.map((r) => {
            const Icon = r.icon;
            const isSelected = role === r.id;
            return (
              <div
                key={r.id}
                className={`login-role-card ${isSelected ? 'selected' : ''}`}
                onClick={() => setRole(r.id)}
                style={{
                  '--accent-color': r.color,
                  '--accent-bg': r.bgLight,
                }}
              >
                <Icon size={20} color={isSelected ? r.color : '#64748b'} />
                <div className="login-role-text">
                  <span className="login-role-title">{r.title}</span>
                  <span className="login-role-subtitle">{r.subtitle}</span>
                </div>
              </div>
            );
          })}
        </div>

        <form onSubmit={handleSubmit} className="auth-form">
          <div className="form-group">
            <label>Employee ID</label>
            <input 
              type="text" 
              value={employeeId} 
              onChange={e => setEmployeeId(e.target.value)} 
              placeholder="EMP-12345" 
              required 
            />
            <small className="field-hint" style={{ marginTop: '2px', fontSize: '0.7rem', color: '#64748b' }}>
              Must follow EMP-XXXXX format
            </small>
          </div>
          <button type="submit" className="auth-btn" disabled={loading}>
            {loading ? 'Saving Workspace...' : 'Continue to Dashboard'}
          </button>
        </form>

        {error && <div className="auth-error">{error}</div>}
      </motion.div>

      <style>{`
        .auth-page {
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          background: linear-gradient(135deg, #0b1120 0%, #1e293b 50%, #0f172a 100%);
          padding: 2rem;
        }
        .auth-container {
          width: 100%;
          max-width: 440px;
          background: rgba(255,255,255,0.96);
          backdrop-filter: blur(20px);
          border-radius: 24px;
          padding: 2.5rem;
          box-shadow: 0 20px 60px rgba(0,0,0,0.4), 0 0 0 1px rgba(255,255,255,0.05);
        }
        .auth-brand {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          margin-bottom: 1.5rem;
          justify-content: center;
        }
        .brand-icon-auth {
          width: 44px;
          height: 44px;
          background: linear-gradient(135deg, #6366f1, #0ea5e9);
          color: white;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 12px;
          font-family: serif;
          font-weight: 700;
          font-size: 1.3rem;
          box-shadow: 0 4px 20px rgba(99, 102, 241, 0.4);
        }
        .brand-name-auth {
          font-size: 1.6rem;
          font-weight: 800;
          color: #1e293b;
          letter-spacing: -0.02em;
        }
        .auth-container h1 {
          text-align: center;
          font-size: 1.6rem;
          font-weight: 700;
          color: #1e293b;
          margin-bottom: 0.25rem;
        }
        .auth-subtitle {
          text-align: center;
          color: #64748b;
          font-size: 0.875rem;
          margin-bottom: 1.75rem;
          line-height: 1.4;
        }

        /* ── Login Role Selector ── */
        .login-role-selector {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 0.5rem;
        }
        .login-role-card {
          padding: 0.75rem 0.5rem;
          background: #ffffff;
          border: 1.5px solid #e2e8f0;
          border-radius: 12px;
          cursor: pointer;
          transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 0.375rem;
          text-align: center;
        }
        .login-role-card:hover {
          border-color: var(--accent-color);
          background: #f8fafc;
        }
        .login-role-card.selected {
          border-color: var(--accent-color);
          background: var(--accent-bg);
          box-shadow: 0 4px 12px rgba(0,0,0,0.02);
        }
        .login-role-text {
          display: flex;
          flex-direction: column;
        }
        .login-role-title {
          font-size: 0.75rem;
          font-weight: 700;
          color: #1e293b;
          line-height: 1.1;
        }
        .login-role-card.selected .login-role-title {
          color: var(--accent-color);
        }
        .login-role-subtitle {
          font-size: 0.65rem;
          color: #64748b;
          margin-top: 1px;
        }

        /* ── Auth Form ── */
        .auth-form {
          display: flex;
          flex-direction: column;
          gap: 1.25rem;
        }
        .form-group {
          display: flex;
          flex-direction: column;
          gap: 0.375rem;
        }
        .form-group label {
          font-size: 0.8rem;
          font-weight: 600;
          color: #475569;
        }
        .form-group input {
          width: 100%;
          padding: 0.75rem 1rem;
          border: 1.5px solid #e2e8f0;
          border-radius: 10px;
          font-size: 0.875rem;
          transition: all 0.2s;
          outline: none;
          background: #f8fafc;
          color: #1e293b;
          box-sizing: border-box;
        }
        .form-group input:focus {
          border-color: #6366f1;
          box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.1);
        }

        .auth-btn {
          width: 100%;
          padding: 0.875rem;
          background: linear-gradient(135deg, #6366f1, #4f46e5);
          color: white;
          border: none;
          border-radius: 10px;
          font-weight: 600;
          font-size: 0.9rem;
          cursor: pointer;
          transition: all 0.2s;
          margin-top: 0.5rem;
        }
        .auth-btn:hover {
          transform: translateY(-1px);
          box-shadow: 0 4px 16px rgba(99,102,241,0.4);
        }

        .auth-error {
          margin-top: 1.25rem;
          padding: 0.75rem 1rem;
          background: #fef2f2;
          border: 1px solid #fecaca;
          border-radius: 10px;
          color: #dc2626;
          font-size: 0.8rem;
          text-align: center;
        }
      `}</style>
    </div>
  );
};

export default CompleteProfile;
