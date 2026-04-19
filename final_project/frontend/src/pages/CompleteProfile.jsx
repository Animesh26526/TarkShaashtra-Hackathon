import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { motion } from 'framer-motion';

const CompleteProfile = () => {
  const { completeProfile, user, checkSession, hasProfile } = useAuth();
  const navigate = useNavigate();
  const [role, setRole] = useState('');
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await completeProfile({ role, employeeId });
      navigate('/');
    } catch (err) {
      setError(err.message || 'Failed to save profile.');
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

        <h1>Complete Your Profile</h1>
        <p className="auth-subtitle">
          Welcome{user?.name ? `, ${user.name}` : ''}! We need a few more details to set up your workspace.
        </p>

        <form onSubmit={handleSubmit} className="auth-form">
          <div className="form-group">
            <label>Role / Category</label>
            <select value={role} onChange={e => setRole(e.target.value)} required>
              <option value="" disabled>Select your role</option>
              <option value="Customer Support Executive">Customer Support Executive</option>
              <option value="Quality Assurance Team">Quality Assurance Team</option>
              <option value="Operations Manager">Operations Manager</option>
            </select>
          </div>
          <div className="form-group">
            <label>Employee ID</label>
            <input type="text" value={employeeId} onChange={e => setEmployeeId(e.target.value)} placeholder="EMP-12345" required />
          </div>
          <button type="submit" className="auth-btn" disabled={loading}>
            {loading ? 'Saving...' : 'Continue to Dashboard'}
          </button>
        </form>

        {error && <div className="auth-error">{error}</div>}
      </motion.div>

      <style>{`
        .auth-page { min-height: 100vh; display: flex; align-items: center; justify-content: center; background: linear-gradient(135deg, #0b1120 0%, #1e293b 50%, #0f172a 100%); padding: 2rem; }
        .auth-container { width: 100%; max-width: 420px; background: rgba(255,255,255,0.95); backdrop-filter: blur(20px); border-radius: 20px; padding: 2.5rem; box-shadow: 0 20px 60px rgba(0,0,0,0.3), 0 0 0 1px rgba(255,255,255,0.1); }
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
      `}</style>
    </div>
  );
};

export default CompleteProfile;
