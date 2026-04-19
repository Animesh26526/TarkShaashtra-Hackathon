import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { motion } from 'framer-motion';

const Signup = () => {
  const { signup } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: '', email: '', password: '', role: '', employeeId: '' });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await signup({
        name: form.name,
        email: form.email,
        password: form.password,
        role: form.role,
        employeeId: form.employeeId,
      });
      setSuccess(true);
    } catch (err) {
      if (err.code === 409) {
        setError('Account already exists. Please login instead.');
      } else {
        setError(err.message || 'Signup failed.');
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

        <h1>Create Account</h1>
        <p className="auth-subtitle">Join the complaint resolution platform</p>

        {!success ? (
          <form onSubmit={handleSubmit} className="auth-form">
            <div className="form-group">
              <label>Full Name</label>
              <input type="text" name="name" value={form.name} onChange={handleChange} placeholder="John Doe" required />
            </div>
            <div className="form-group">
              <label>Email Address</label>
              <input type="email" name="email" value={form.email} onChange={handleChange} placeholder="john@example.com" required />
            </div>
            <div className="form-group">
              <label>Role / Category</label>
              <select name="role" value={form.role} onChange={handleChange} required>
                <option value="" disabled>Select your role</option>
                <option value="Customer Support Executive">Customer Support Executive</option>
                <option value="Quality Assurance Team">Quality Assurance Team</option>
                <option value="Operations Manager">Operations Manager</option>
              </select>
            </div>
            <div className="form-group">
              <label>Employee ID</label>
              <input type="text" name="employeeId" value={form.employeeId} onChange={handleChange} placeholder="EMP-12345" required />
            </div>
            <div className="form-group">
              <label>Password (min 8 characters)</label>
              <input type="password" name="password" value={form.password} onChange={handleChange} placeholder="••••••••" minLength="8" required />
            </div>
            <button type="submit" className="auth-btn" disabled={loading}>
              {loading ? 'Creating Account...' : 'Create Account'}
            </button>
          </form>
        ) : (
          <div className="auth-success">
            <div className="success-icon">✅</div>
            <h3>Account Created!</h3>
            <p>A verification email has been sent to <strong>{form.email}</strong>. Please check your inbox and click the verification link before signing in.</p>
            <Link to="/login" className="auth-btn" style={{ display: 'block', textAlign: 'center', textDecoration: 'none', marginTop: '1rem' }}>
              Go to Sign In
            </Link>
          </div>
        )}

        {error && <div className="auth-error">{error}</div>}

        <div className="auth-switch">
          Already have an account? <Link to="/login">Sign In</Link>
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
        .auth-brand { display: flex; align-items: center; gap: 0.75rem; margin-bottom: 2rem; justify-content: center; }
        .brand-icon-auth { width: 42px; height: 42px; background: linear-gradient(135deg, #6366f1, #0ea5e9); color: white; display: flex; align-items: center; justify-content: center; border-radius: 12px; font-family: serif; font-weight: 700; font-size: 1.25rem; box-shadow: 0 4px 20px rgba(99, 102, 241, 0.4); }
        .brand-name-auth { font-size: 1.5rem; font-weight: 700; color: #1e293b; letter-spacing: -0.02em; }
        .auth-container h1 { text-align: center; font-size: 1.5rem; font-weight: 700; color: #1e293b; margin-bottom: 0.25rem; }
        .auth-subtitle { text-align: center; color: #64748b; font-size: 0.875rem; margin-bottom: 2rem; }
        .auth-form { display: flex; flex-direction: column; gap: 1.25rem; }
        .form-group { display: flex; flex-direction: column; gap: 0.375rem; }
        .form-group label { font-size: 0.8rem; font-weight: 600; color: #475569; }
        .form-group input, .form-group select { padding: 0.75rem 1rem; border: 1px solid #e2e8f0; border-radius: 10px; font-size: 0.875rem; transition: all 0.2s; outline: none; background: #f8fafc; color: #1e293b; }
        .form-group input:focus, .form-group select:focus { border-color: #6366f1; box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.1); }
        .auth-btn { padding: 0.875rem; background: linear-gradient(135deg, #6366f1, #4f46e5); color: white; border: none; border-radius: 10px; font-weight: 600; font-size: 0.9rem; cursor: pointer; transition: all 0.2s; margin-top: 0.5rem; }
        .auth-btn:hover { transform: translateY(-1px); box-shadow: 0 4px 16px rgba(99,102,241,0.4); }
        .auth-btn:disabled { opacity: 0.6; cursor: not-allowed; transform: none; }
        .auth-error { margin-top: 1rem; padding: 0.75rem 1rem; background: #fef2f2; border: 1px solid #fecaca; border-radius: 10px; color: #dc2626; font-size: 0.8rem; text-align: center; }
        .auth-success { text-align: center; padding: 1rem 0; }
        .success-icon { font-size: 2.5rem; margin-bottom: 1rem; }
        .auth-success h3 { font-size: 1.2rem; color: #1e293b; margin-bottom: 0.5rem; }
        .auth-success p { color: #64748b; font-size: 0.875rem; line-height: 1.5; }
        .auth-switch { text-align: center; margin-top: 1.5rem; font-size: 0.8rem; color: #64748b; }
        .auth-switch a { color: #6366f1; font-weight: 600; text-decoration: none; }
        .auth-switch a:hover { text-decoration: underline; }
      `}</style>
    </div>
  );
};

export default Signup;
