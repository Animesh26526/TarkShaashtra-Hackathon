import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { motion } from 'framer-motion';

const Login = () => {
  const { login, loginWithGoogle } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const user = await login(email, password);
      if (!user.prefs?.role) {
        navigate('/complete-profile');
      } else {
        navigate('/');
      }
    } catch (err) {
      if (err.message === 'EMAIL_NOT_VERIFIED') {
        setError('Email not verified. A new verification link has been sent to your inbox.');
      } else if (err.code === 401 || err.message?.includes('Invalid')) {
        setError('Invalid email or password.');
      } else {
        setError(err.message || 'Login failed. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <motion.div className="auth-container" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
        <div className="auth-brand">
          <div className="brand-icon-auth">R</div>
          <span className="brand-name-auth">Resolvo</span>
        </div>

        <h1>Welcome Back</h1>
        <p className="auth-subtitle">Sign in to your complaint management portal</p>

        <form onSubmit={handleSubmit} className="auth-form">
          <div className="form-group">
            <label>Email Address</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="name@company.com" required />
          </div>
          <div className="form-group">
            <label>Password</label>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" required />
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
          max-width: 420px;
          background: rgba(255,255,255,0.95);
          backdrop-filter: blur(20px);
          border-radius: 20px;
          padding: 2.5rem;
          box-shadow: 0 20px 60px rgba(0,0,0,0.3), 0 0 0 1px rgba(255,255,255,0.1);
        }
        .auth-brand {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          margin-bottom: 2rem;
          justify-content: center;
        }
        .brand-icon-auth {
          width: 42px;
          height: 42px;
          background: linear-gradient(135deg, #6366f1, #0ea5e9);
          color: white;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 12px;
          font-family: serif;
          font-weight: 700;
          font-size: 1.25rem;
          box-shadow: 0 4px 20px rgba(99, 102, 241, 0.4);
        }
        .brand-name-auth {
          font-size: 1.5rem;
          font-weight: 700;
          color: #1e293b;
          letter-spacing: -0.02em;
        }
        .auth-container h1 {
          text-align: center;
          font-size: 1.5rem;
          font-weight: 700;
          color: #1e293b;
          margin-bottom: 0.25rem;
        }
        .auth-subtitle {
          text-align: center;
          color: #64748b;
          font-size: 0.875rem;
          margin-bottom: 2rem;
        }
        .auth-form { display: flex; flex-direction: column; gap: 1.25rem; }
        .form-group { display: flex; flex-direction: column; gap: 0.375rem; }
        .form-group label { font-size: 0.8rem; font-weight: 600; color: #475569; }
        .form-group input, .form-group select {
          padding: 0.75rem 1rem;
          border: 1px solid #e2e8f0;
          border-radius: 10px;
          font-size: 0.875rem;
          transition: all 0.2s;
          outline: none;
          background: #f8fafc;
          color: #1e293b;
        }
        .form-group input:focus, .form-group select:focus {
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
        .auth-btn:hover { transform: translateY(-1px); box-shadow: 0 4px 16px rgba(99,102,241,0.4); }
        .auth-btn:disabled { opacity: 0.6; cursor: not-allowed; transform: none; }
        .auth-error {
          margin-top: 1rem;
          padding: 0.75rem 1rem;
          background: #fef2f2;
          border: 1px solid #fecaca;
          border-radius: 10px;
          color: #dc2626;
          font-size: 0.8rem;
          text-align: center;
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
          border: 1px solid #e2e8f0;
          border-radius: 10px;
          background: white;
          font-weight: 500;
          font-size: 0.875rem;
          cursor: pointer;
          transition: all 0.2s;
          color: #374151;
        }
        .google-btn:hover { background: #f8fafc; border-color: #cbd5e1; }
        .auth-switch {
          text-align: center;
          margin-top: 1.5rem;
          font-size: 0.8rem;
          color: #64748b;
        }
        .auth-switch a { color: #6366f1; font-weight: 600; text-decoration: none; }
        .auth-switch a:hover { text-decoration: underline; }
      `}</style>
    </div>
  );
};

export default Login;
