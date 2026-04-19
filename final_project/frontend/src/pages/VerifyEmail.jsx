import React, { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Client, Account } from 'appwrite';
import { motion } from 'framer-motion';

const VerifyEmail = () => {
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState('verifying'); // verifying, success, error

  useEffect(() => {
    const userId = searchParams.get('userId');
    const secret = searchParams.get('secret');

    if (!userId || !secret) {
      setStatus('error');
      return;
    }

    const client = new Client()
      .setEndpoint(import.meta.env.VITE_APPWRITE_ENDPOINT)
      .setProject(import.meta.env.VITE_APPWRITE_PROJECT_ID);
    const account = new Account(client);

    account.updateVerification(userId, secret)
      .then(() => setStatus('success'))
      .catch(() => setStatus('error'));
  }, [searchParams]);

  return (
    <div className="auth-page">
      <motion.div className="auth-container" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
        <div className="auth-brand">
          <div className="brand-icon-auth">R</div>
          <span className="brand-name-auth">Resolvo</span>
        </div>

        {status === 'verifying' && (
          <div style={{ textAlign: 'center', padding: '2rem 0' }}>
            <div className="spinner" />
            <p style={{ color: '#64748b', marginTop: '1rem' }}>Verifying your email...</p>
          </div>
        )}

        {status === 'success' && (
          <div style={{ textAlign: 'center', padding: '1rem 0' }}>
            <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>✅</div>
            <h2 style={{ color: '#1e293b', marginBottom: '0.5rem' }}>Email Verified!</h2>
            <p style={{ color: '#64748b', fontSize: '0.875rem', marginBottom: '1.5rem' }}>
              Your account is now active. You can sign in to access your dashboard.
            </p>
            <Link to="/login" className="auth-btn" style={{ display: 'inline-block', textDecoration: 'none', padding: '0.75rem 2rem' }}>
              Sign In
            </Link>
          </div>
        )}

        {status === 'error' && (
          <div style={{ textAlign: 'center', padding: '1rem 0' }}>
            <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>❌</div>
            <h2 style={{ color: '#1e293b', marginBottom: '0.5rem' }}>Verification Failed</h2>
            <p style={{ color: '#64748b', fontSize: '0.875rem', marginBottom: '1.5rem' }}>
              The verification link may have expired or is invalid. Try signing in to get a fresh link.
            </p>
            <Link to="/login" className="auth-btn" style={{ display: 'inline-block', textDecoration: 'none', padding: '0.75rem 2rem' }}>
              Go to Sign In
            </Link>
          </div>
        )}
      </motion.div>

      <style>{`
        .auth-page { min-height: 100vh; display: flex; align-items: center; justify-content: center; background: linear-gradient(135deg, #0b1120 0%, #1e293b 50%, #0f172a 100%); padding: 2rem; }
        .auth-container { width: 100%; max-width: 420px; background: rgba(255,255,255,0.95); backdrop-filter: blur(20px); border-radius: 20px; padding: 2.5rem; box-shadow: 0 20px 60px rgba(0,0,0,0.3), 0 0 0 1px rgba(255,255,255,0.1); }
        .auth-brand { display: flex; align-items: center; gap: 0.75rem; margin-bottom: 2rem; justify-content: center; }
        .brand-icon-auth { width: 42px; height: 42px; background: linear-gradient(135deg, #6366f1, #0ea5e9); color: white; display: flex; align-items: center; justify-content: center; border-radius: 12px; font-family: serif; font-weight: 700; font-size: 1.25rem; box-shadow: 0 4px 20px rgba(99, 102, 241, 0.4); }
        .brand-name-auth { font-size: 1.5rem; font-weight: 700; color: #1e293b; letter-spacing: -0.02em; }
        .auth-btn { padding: 0.875rem; background: linear-gradient(135deg, #6366f1, #4f46e5); color: white; border: none; border-radius: 10px; font-weight: 600; font-size: 0.9rem; cursor: pointer; transition: all 0.2s; }
        .auth-btn:hover { transform: translateY(-1px); box-shadow: 0 4px 16px rgba(99,102,241,0.4); }
        .spinner {
          width: 40px; height: 40px; margin: 0 auto;
          border: 3px solid #e2e8f0; border-top-color: #6366f1;
          border-radius: 50%; animation: spin 0.8s linear infinite;
        }
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
};

export default VerifyEmail;
