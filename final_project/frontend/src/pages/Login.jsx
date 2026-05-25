import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { motion } from 'framer-motion';
import { UserCheck, Shield, Award } from 'lucide-react';

const Login = () => {
  const { login, loginWithGoogle } = useAuth();
  const navigate = useNavigate();
  const [role, setRole] = useState('Customer Support Executive'); // Default role
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const response = await login(email, password, role);
      if (response.needsProfile) {
        navigate('/complete-profile');
      } else {
        navigate('/');
      }
    } catch (err) {
      if (err.message === 'ROLE_MISMATCH') {
        setError(`Role mismatch! This account is registered as a "${err.storedRole}". Please select the correct role above.`);
      } else if (err.code === 401 || err.message?.includes('Invalid') || err.message?.includes('credentials')) {
        setError('Invalid email or password for the selected role.');
      } else {
        setError(err.message || 'Login failed. Please try again.');
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

        <h1>Welcome Back</h1>
        <p className="auth-subtitle">Choose your portal and sign in</p>

        {/* Role Selector Cards for Login */}
        <div className="login-role-selector">
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
            <label>Email Address</label>
            <input 
              type="email" 
              value={email} 
              onChange={e => setEmail(e.target.value)} 
              placeholder="name@company.com" 
              required 
            />
          </div>
          <div className="form-group">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <label>Password</label>
              <Link to="/forgot-password" style={{ fontSize: '0.75rem', color: '#6366f1', textDecoration: 'none', fontWeight: 600 }}>
                Forgot Password?
              </Link>
            </div>
            <input 
              type="password" 
              value={password} 
              onChange={e => setPassword(e.target.value)} 
              placeholder="••••••••" 
              required 
            />
          </div>
          <button type="submit" className="auth-btn" disabled={loading}>
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>

        {error && <div className="auth-error">{error}</div>}

        <div className="auth-divider"><span>OR</span></div>

        <button type="button" className="google-btn" onClick={loginWithGoogle}>
          <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" width="18" alt="Google" />
          Continue with Google
        </button>

        <div className="auth-switch">
          Don't have an account? <Link to="/signup">Create Account</Link>
        </div>
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
        }

        /* ── Login Role Selector ── */
        .login-role-selector {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 0.5rem;
          margin-bottom: 1.75rem;
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
          padding: 0.75rem 1rem;
          border: 1.5px solid #e2e8f0;
          border-radius: 10px;
          font-size: 0.875rem;
          transition: all 0.2s;
          outline: none;
          background: #f8fafc;
          color: #1e293b;
        }
        .form-group input:focus {
          border-color: #6366f1;
          box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.1);
        }

        .auth-btn {
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
        .auth-btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
          transform: none;
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
          line-height: 1.4;
        }

        .auth-divider {
          display: flex;
          align-items: center;
          gap: 1rem;
          margin: 1.5rem 0;
          color: #94a3b8;
          font-size: 0.75rem;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }
        .auth-divider::before, .auth-divider::after {
          content: '';
          flex: 1;
          height: 1px;
          background: #e2e8f0;
        }

        .google-btn {
          width: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.75rem;
          padding: 0.75rem;
          border: 1.5px solid #e2e8f0;
          border-radius: 10px;
          background: white;
          font-weight: 600;
          font-size: 0.875rem;
          cursor: pointer;
          transition: all 0.2s;
          color: #374151;
        }
        .google-btn:hover {
          background: #f8fafc;
          border-color: #cbd5e1;
        }

        .auth-switch {
          text-align: center;
          margin-top: 1.5rem;
          font-size: 0.8rem;
          color: #64748b;
        }
        .auth-switch a {
          color: #6366f1;
          font-weight: 600;
          text-decoration: none;
        }
        .auth-switch a:hover {
          text-decoration: underline;
        }
      `}</style>
    </div>
  );
};

export default Login;
