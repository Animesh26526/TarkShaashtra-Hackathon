import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth, VALID_ROLES } from '../context/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';
import { UserCheck, Shield, Award, ArrowRight, ArrowLeft } from 'lucide-react';

const Signup = () => {
  const { signup } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [role, setRole] = useState('');
  const [form, setForm] = useState({ name: '', email: '', password: '', confirmPassword: '', employeeId: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));

  const validateEmployeeId = (id) => {
    return /^EMP-\d{5}$/i.test(id.trim());
  };

  const handleNextStep = () => {
    if (!role) {
      setError('Please select a role to continue.');
      return;
    }
    setError('');
    setStep(2);
  };

  const handlePrevStep = () => {
    setError('');
    setStep(1);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!form.name.trim()) return setError('Name is required.');
    if (!form.email.trim()) return setError('Email is required.');
    if (!form.employeeId.trim()) return setError('Employee ID is required.');
    if (!validateEmployeeId(form.employeeId)) {
      return setError('Employee ID must follow the EMP-XXXXX format (e.g. EMP-12345).');
    }
    if (form.password.length < 8) return setError('Password must be at least 8 characters long.');
    if (form.password !== form.confirmPassword) return setError('Passwords do not match.');

    setLoading(true);
    try {
      await signup({
        name: form.name.trim(),
        email: form.email.trim(),
        password: form.password,
        role,
        employeeId: form.employeeId.trim(),
      });
      // Redirect to dashboard on successful signup
      navigate('/');
    } catch (err) {
      if (err.code === 409) {
        setError('An account with this email already exists.');
      } else {
        setError(err.message || 'Signup failed.');
      }
    } finally {
      setLoading(false);
    }
  };

  const rolesData = [
    {
      id: 'Customer Support Executive',
      title: 'Customer Support Executive',
      subtitle: 'Frontline Submissions',
      description: 'Submit and manage complaints, monitor real-time AI classification progress, and handle direct customer engagement.',
      icon: UserCheck,
      color: '#6366f1',
      bgLight: 'rgba(99, 102, 241, 0.08)',
    },
    {
      id: 'Quality Assurance Team',
      title: 'Quality Assurance Team',
      subtitle: 'Compliance & Audits',
      description: 'Perform deep audits, execute AI re-reviews, resolve discrepancies, and annotate complaints with quality compliance metadata.',
      icon: Shield,
      color: '#0ea5e9',
      bgLight: 'rgba(14, 165, 233, 0.08)',
    },
    {
      id: 'Operations Manager',
      title: 'Operations Manager',
      subtitle: 'SLA & Full Controls',
      description: 'Access business analytics, manage team SLAs, perform data export / backups, and oversee organization operations.',
      icon: Award,
      color: '#f59e0b',
      bgLight: 'rgba(245, 158, 11, 0.08)',
    },
  ];

  return (
    <div className="auth-page">
      <motion.div 
        className="auth-container signup-container" 
        initial={{ opacity: 0, y: 30 }} 
        animate={{ opacity: 1, y: 0 }} 
        transition={{ duration: 0.5 }}
      >
        <div className="auth-brand">
          <div className="brand-icon-auth">R</div>
          <span className="brand-name-auth">Resolvo</span>
        </div>

        <h1>Create Account</h1>
        <p className="auth-subtitle">
          {step === 1 ? 'Step 1: Choose your organizational role' : 'Step 2: Complete your credentials'}
        </p>

        <AnimatePresence mode="wait">
          {step === 1 ? (
            <motion.div 
              key="step-1"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              transition={{ duration: 0.3 }}
            >
              <div className="role-cards-container">
                {rolesData.map((r) => {
                  const Icon = r.icon;
                  const isSelected = role === r.id;
                  return (
                    <div 
                      key={r.id}
                      className={`role-card ${isSelected ? 'selected' : ''}`}
                      onClick={() => setRole(r.id)}
                      style={{
                        '--accent-color': r.color,
                        '--accent-bg': r.bgLight,
                      }}
                    >
                      <div className="role-card-header">
                        <div className="role-icon-box">
                          <Icon size={22} color={r.color} />
                        </div>
                        <div className="role-titles">
                          <h3>{r.title}</h3>
                          <span className="role-card-subtitle">{r.subtitle}</span>
                        </div>
                      </div>
                      <p className="role-card-desc">{r.description}</p>
                      <div className="selection-dot" />
                    </div>
                  );
                })}
              </div>

              {error && <div className="auth-error">{error}</div>}

              <button type="button" className="auth-btn next-btn" onClick={handleNextStep}>
                Next Step <ArrowRight size={16} />
              </button>
            </motion.div>
          ) : (
            <motion.form 
              key="step-2"
              onSubmit={handleSubmit} 
              className="auth-form"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
            >
              <div className="selected-role-preview">
                <span className="preview-label">Selected Role:</span>
                <span className="preview-value">{role}</span>
              </div>

              <div className="form-grid">
                <div className="form-group">
                  <label>Full Name</label>
                  <input 
                    type="text" 
                    name="name" 
                    value={form.name} 
                    onChange={handleChange} 
                    placeholder="John Doe" 
                    required 
                  />
                </div>

                <div className="form-group">
                  <label>Email Address</label>
                  <input 
                    type="email" 
                    name="email" 
                    value={form.email} 
                    onChange={handleChange} 
                    placeholder="john@company.com" 
                    required 
                  />
                </div>

                <div className="form-group">
                  <label>Employee ID</label>
                  <input 
                    type="text" 
                    name="employeeId" 
                    value={form.employeeId} 
                    onChange={handleChange} 
                    placeholder="EMP-12345" 
                    required 
                  />
                  <small className="field-hint">Must follow EMP-XXXXX format</small>
                </div>

                <div className="form-group">
                  <label>Password (min 8 chars)</label>
                  <input 
                    type="password" 
                    name="password" 
                    value={form.password} 
                    onChange={handleChange} 
                    placeholder="••••••••" 
                    minLength="8" 
                    required 
                  />
                </div>

                <div className="form-group">
                  <label>Confirm Password</label>
                  <input 
                    type="password" 
                    name="confirmPassword" 
                    value={form.confirmPassword} 
                    onChange={handleChange} 
                    placeholder="••••••••" 
                    minLength="8" 
                    required 
                  />
                </div>
              </div>

              {error && <div className="auth-error">{error}</div>}

              <div className="step-actions">
                <button type="button" className="secondary-btn" onClick={handlePrevStep} disabled={loading}>
                  <ArrowLeft size={16} /> Back
                </button>
                <button type="submit" className="auth-btn submit-btn" disabled={loading}>
                  {loading ? 'Creating Account...' : 'Create Account'}
                </button>
              </div>
            </motion.form>
          )}
        </AnimatePresence>

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
          max-width: 460px;
          background: rgba(255,255,255,0.96);
          backdrop-filter: blur(20px);
          border-radius: 24px;
          padding: 2.5rem;
          box-shadow: 0 20px 60px rgba(0,0,0,0.4), 0 0 0 1px rgba(255,255,255,0.05);
        }
        .signup-container {
          max-width: 500px;
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
          margin-bottom: 2rem;
        }

        /* ── Role Selector Cards ── */
        .role-cards-container {
          display: flex;
          flex-direction: column;
          gap: 1rem;
          margin-bottom: 1.5rem;
        }
        .role-card {
          padding: 1rem 1.25rem;
          background: #ffffff;
          border: 2px solid #e2e8f0;
          border-radius: 16px;
          cursor: pointer;
          transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
          position: relative;
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }
        .role-card:hover {
          transform: translateY(-2px);
          border-color: var(--accent-color);
          box-shadow: 0 8px 24px rgba(0,0,0,0.06);
        }
        .role-card.selected {
          border-color: var(--accent-color);
          background: var(--accent-bg);
        }
        .role-card-header {
          display: flex;
          align-items: center;
          gap: 1rem;
        }
        .role-icon-box {
          width: 40px;
          height: 40px;
          border-radius: 10px;
          background: #f8fafc;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
          transition: background 0.25s;
        }
        .role-card.selected .role-icon-box {
          background: #ffffff;
          box-shadow: 0 4px 12px rgba(0,0,0,0.03);
        }
        .role-titles {
          display: flex;
          flex-direction: column;
        }
        .role-titles h3 {
          font-size: 0.95rem;
          font-weight: 700;
          color: #1e293b;
          margin: 0;
        }
        .role-card-subtitle {
          font-size: 0.75rem;
          font-weight: 600;
          color: #64748b;
          margin-top: 1px;
        }
        .role-card-desc {
          font-size: 0.8rem;
          color: #475569;
          margin: 0;
          line-height: 1.4;
          padding-left: 3.5rem;
        }
        .selection-dot {
          position: absolute;
          top: 1.25rem;
          right: 1.25rem;
          width: 16px;
          height: 16px;
          border-radius: 50%;
          border: 2px solid #cbd5e1;
          transition: all 0.2s;
        }
        .role-card.selected .selection-dot {
          border-color: var(--accent-color);
          background: var(--accent-color);
          box-shadow: inset 0 0 0 3px #ffffff;
        }

        /* ── Preview Label ── */
        .selected-role-preview {
          background: rgba(99, 102, 241, 0.08);
          border: 1px solid rgba(99, 102, 241, 0.15);
          border-radius: 12px;
          padding: 0.75rem 1rem;
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 1.25rem;
        }
        .preview-label {
          font-size: 0.8rem;
          font-weight: 600;
          color: #4f46e5;
        }
        .preview-value {
          font-size: 0.85rem;
          font-weight: 700;
          color: #1e293b;
        }

        /* ── Form Layout ── */
        .auth-form {
          display: flex;
          flex-direction: column;
          gap: 1.25rem;
        }
        .form-grid {
          display: grid;
          grid-template-columns: 1fr;
          gap: 1rem;
        }
        @media(min-width: 480px) {
          .form-grid {
            grid-template-columns: 1fr 1fr;
          }
          .form-grid .form-group:nth-child(1),
          .form-grid .form-group:nth-child(2) {
            grid-column: span 2;
          }
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
        .field-hint {
          font-size: 0.7rem;
          color: #64748b;
          margin-top: 1px;
        }

        /* ── Button Actions ── */
        .auth-btn {
          width: 100%;
          padding: 0.875rem;
          background: linear-gradient(135deg, #6366f1, #4f46e5);
          color: white;
          border: none;
          border-radius: 12px;
          font-weight: 600;
          font-size: 0.9rem;
          cursor: pointer;
          transition: all 0.2s;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.5rem;
        }
        .auth-btn:hover {
          transform: translateY(-1px);
          box-shadow: 0 4px 16px rgba(99,102,241,0.4);
        }
        .next-btn {
          margin-top: 0.5rem;
        }
        .step-actions {
          display: flex;
          gap: 0.75rem;
          margin-top: 0.5rem;
        }
        .secondary-btn {
          flex: 1;
          padding: 0.875rem;
          background: #ffffff;
          border: 1.5px solid #cbd5e1;
          border-radius: 12px;
          color: #475569;
          font-weight: 600;
          font-size: 0.9rem;
          cursor: pointer;
          transition: all 0.2s;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.5rem;
        }
        .secondary-btn:hover {
          background: #f8fafc;
          border-color: #94a3b8;
        }
        .secondary-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
        .submit-btn {
          flex: 2;
        }

        .auth-error {
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

export default Signup;
