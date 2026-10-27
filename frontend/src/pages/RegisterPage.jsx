import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { UserPlus, AlertCircle } from 'lucide-react';

export default function RegisterPage({ onNavigate }) {
  const { register } = useAuth();
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    role: 'student',
    studentId: '',
    department: ''
  });
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setLoading(true);
    try {
      await register(formData);
      onNavigate('services');
    } catch (err) {
      setErrorMsg(err.message || 'Registration failed. Please review your details.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: '500px', margin: '2rem auto' }}>
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
            <UserPlus size={24} />
          </div>
          <h2 className="card-title">Create Campus Account</h2>
          <p style={{ color: 'var(--gray-500)', fontSize: '0.875rem' }}>
            Register to schedule appointments and join queues
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
            <label className="form-label">Full Name</label>
            <input
              type="text"
              name="name"
              className="form-input"
              placeholder="e.g. Jordan Lee"
              required
              value={formData.name}
              onChange={handleChange}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Campus Email</label>
            <input
              type="email"
              name="email"
              className="form-input"
              placeholder="jordan.lee@campus.edu"
              required
              value={formData.email}
              onChange={handleChange}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Password</label>
            <input
              type="password"
              name="password"
              className="form-input"
              placeholder="At least 6 characters"
              required
              minLength={6}
              value={formData.password}
              onChange={handleChange}
            />
          </div>

          <div className="grid-2" style={{ gap: '1rem', marginBottom: '1.25rem' }}>
            <div>
              <label className="form-label">Account Role</label>
              <select
                name="role"
                className="form-select"
                value={formData.role}
                onChange={handleChange}
              >
                <option value="student">Student</option>
                <option value="admin">Administrator / Staff</option>
              </select>
            </div>

            <div>
              <label className="form-label">
                {formData.role === 'admin' ? 'Staff ID' : 'Student ID'}
              </label>
              <input
                type="text"
                name="studentId"
                className="form-input"
                placeholder="STU-2026-XXXX"
                value={formData.studentId}
                onChange={handleChange}
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Academic Department / Office</label>
            <input
              type="text"
              name="department"
              className="form-input"
              placeholder="e.g. Computer Science, Financial Aid, School of Business"
              value={formData.department}
              onChange={handleChange}
            />
          </div>

          <button
            type="submit"
            className="btn btn-primary"
            style={{ width: '100%', marginTop: '0.75rem' }}
            disabled={loading}
          >
            {loading ? <div className="spinner" /> : <><UserPlus size={16} /> Complete Registration</>}
          </button>
        </form>

        <p style={{ textAlign: 'center', fontSize: '0.85rem', color: 'var(--gray-600)', marginTop: '1.25rem' }}>
          Already have an account?{' '}
          <button
            type="button"
            onClick={() => onNavigate('login')}
            style={{ background: 'none', border: 'none', color: 'var(--primary)', fontWeight: 600, cursor: 'pointer' }}
          >
            Sign In Here
          </button>
        </p>
      </div>
    </div>
  );
}
