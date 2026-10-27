import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { LogIn, Key, Mail, CheckCircle2, AlertCircle } from 'lucide-react';

export default function LoginPage({ onNavigate }) {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setLoading(true);
    try {
      await login(email, password);
      onNavigate('services');
    } catch (err) {
      setErrorMsg(err.message || 'Login failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  const fillDemo = (demoEmail, demoPass) => {
    setEmail(demoEmail);
    setPassword(demoPass);
    setErrorMsg('');
  };

  return (
    <div style={{ maxWidth: '440px', margin: '2rem auto' }}>
      <div className="card">
        <div style={{ textAlign: 'center', marginBottom: '1.75rem' }}>
          <div
            style={{
              width: '48px',
              height: '48px',
              borderRadius: '50%',
              background: 'var(--primary-light)',
              color: 'var(--primary)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 1rem'
            }}
          >
            <LogIn size={24} />
          </div>
          <h2 className="card-title">Welcome to QueueLess</h2>
          <p style={{ color: 'var(--gray-500)', fontSize: '0.875rem' }}>
            Campus Appointment Booking & Real-Time Queue Management
          </p>
        </div>

        {errorMsg && (
          <div className="alert alert-danger">
            <AlertCircle size={18} />
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Email Address</label>
            <div style={{ position: 'relative' }}>
              <input
                type="email"
                className="form-input"
                placeholder="student@campus.edu"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Password</label>
            <input
              type="password"
              className="form-input"
              placeholder="••••••••"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          <button
            type="submit"
            className="btn btn-primary"
            style={{ width: '100%', marginTop: '0.5rem' }}
            disabled={loading}
          >
            {loading ? <div className="spinner" /> : <><LogIn size={16} /> Sign In</>}
          </button>
        </form>

        <div style={{ margin: '1.75rem 0 1rem', borderTop: '1px solid var(--gray-200)', paddingTop: '1.25rem' }}>
          <p style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--gray-500)', marginBottom: '0.75rem' }}>
            Quick Demo Accounts:
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={() => fillDemo('student@campus.edu', 'StudentPass123!')}
            >
              Student Demo
            </button>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={() => fillDemo('admin@campus.edu', 'AdminPass123!')}
            >
              Admin Demo
            </button>
          </div>
        </div>

        <p style={{ textAlign: 'center', fontSize: '0.85rem', color: 'var(--gray-600)', marginTop: '1.25rem' }}>
          Need a campus account?{' '}
          <button
            type="button"
            onClick={() => onNavigate('register')}
            style={{ background: 'none', border: 'none', color: 'var(--primary)', fontWeight: 600, cursor: 'pointer' }}
          >
            Register Here
          </button>
        </p>
      </div>
    </div>
  );
}
