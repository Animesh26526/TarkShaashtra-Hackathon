import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { motion } from 'framer-motion';
import { Mail, ArrowLeft, CheckCircle } from 'lucide-react';

const ForgotPassword = () => {
  const { sendPasswordRecovery } = useAuth();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!email.trim()) return setError('Please enter your email address.');

    setLoading(true);
    try {
      await sendPasswordRecovery(email.trim());
      setSuccess(true);
    } catch (err) {
      setError(err.message || 'Failed to send recovery email. Please check the email and try again.');
    } finally {
      setLoading(false);
    }
  };

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

        {!success ? (
          <>
            <h1>Recover Password</h1>
            <p className="auth-subtitle">Enter your registered email and we'll send you a recovery link</p>

            <form onSubmit={handleSubmit} className="auth-form">
              <div className="form-group">
                <label>Email Address</label>
                <div style={{ position: 'relative' }}>
                  <input 
                    type="email" 
                    value={email} 
                    onChange={e => setEmail(e.target.value)} 
                    placeholder="name@company.com" 
                    style={{ paddingLeft: '2.5rem' }}
                    required 
                  />
                  <Mail 
                    size={16} 
                    color="#64748b" 
                    style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)' }} 
                  />
                </div>
              </div>
              <button type="submit" className="auth-btn" disabled={loading}>
                {loading ? 'Sending Link...' : 'Send Recovery Link'}
              </button>
            </form>
          </>
        ) : (
          <div className="recovery-success">
            <CheckCircle size={48} color="#22c55e" style={{ margin: '0 auto 1.25rem' }} />
            <h3>Check Your Email</h3>
            <p className="success-message">
              We have successfully dispatched a password recovery link to <strong>{email}</strong>. 
              Please click the link in the email to set a new password.
            </p>
            <Link to="/login" className="auth-btn" style={{ display: 'block', textDecoration: 'none', textAlign: 'center', marginTop: '1.5rem' }}>
              Return to Sign In
            </Link>
          </div>
        )}

        {error && <div className="auth-error">{error}</div>}

        <div className="auth-switch" style={{ marginTop: '1.75rem' }}>
          <Link to="/login" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.375rem', fontWeight: 600 }}>
            <ArrowLeft size={14} /> Back to Sign In
          </Link>
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
          line-height: 1.4;
        }

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
        .auth-btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .recovery-success {
          text-align: center;
          padding: 0.5rem 0;
        }
        .recovery-success h3 {
          font-size: 1.25rem;
          color: #1e293b;
          margin-bottom: 0.5rem;
        }
        .success-message {
          font-size: 0.875rem;
          color: #64748b;
          line-height: 1.5;
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
        .auth-switch {
          text-align: center;
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

export default ForgotPassword;
