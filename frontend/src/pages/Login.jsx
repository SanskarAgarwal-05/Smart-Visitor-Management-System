import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/api';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  // Redirect to dashboard if already logged in
  useEffect(() => {
    const token = localStorage.getItem('adminToken');
    if (token) {
      navigate('/dashboard');
    }
  }, [navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    
    if (!email || !password) {
      setError('Please fill in both fields.');
      return;
    }

    setLoading(true);

    try {
      const response = await api.post('/admin/login', { email, password });
      
      // Save details in localStorage
      localStorage.setItem('adminToken', response.data.token);
      localStorage.setItem('userRole', response.data.admin.role || 'admin');
      localStorage.setItem('userEmail', response.data.admin.email || '');
      localStorage.setItem('userFullName', response.data.admin.fullName || '');
      
      // Redirect to dashboard
      navigate('/dashboard');
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.message || 'Invalid email or password.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      display: 'flex',
      minHeight: '100vh',
      width: '100vw',
      position: 'fixed',
      top: 0,
      left: 0,
      zIndex: 1000,
      backgroundColor: 'var(--bg-app)',
      fontFamily: 'var(--font-sans)',
    }}>
      {/* LEFT FORM PANE */}
      <div style={{
        flex: '1 1 50%',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        padding: 'var(--space-12) var(--space-8)',
        maxWidth: '560px',
        margin: '0 auto',
        zIndex: 2,
      }}>
        <div style={{ marginBottom: 'var(--space-8)' }}>
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 'var(--space-2)',
            color: 'var(--primary)',
            fontWeight: 'var(--weight-extrabold)',
            fontSize: '1.25rem',
            marginBottom: 'var(--space-2)'
          }}>
            <svg viewBox="0 0 24 24" width="30" height="30" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
              <line x1="9" y1="3" x2="9" y2="21" />
              <path d="M14 9l-2 2 2 2" />
            </svg>
            <span>SmartVisitor</span>
          </div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 'var(--weight-extrabold)', color: 'var(--text-primary)' }}>Welcome back</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginTop: 'var(--space-1)' }}>
            Enter your credentials to access the visitor administration console.
          </p>
        </div>

        {error && <div className="alert alert-danger">{error}</div>}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
          <div className="form-group">
            <label className="form-label" htmlFor="email">Email Address</label>
            <input
              type="email"
              id="email"
              className="form-control"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="admin@example.com"
              required
              disabled={loading}
              style={{ padding: '12px 16px' }}
            />
          </div>

          <div className="form-group">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-15)' }}>
              <label className="form-label" htmlFor="password" style={{ margin: 0 }}>Password</label>
              <a href="#forgot" style={{ fontSize: '0.775rem', color: 'var(--primary)', textDecoration: 'none', fontWeight: 'var(--weight-semibold)' }}>Forgot password?</a>
            </div>
            <input
              type="password"
              id="password"
              className="form-control"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              disabled={loading}
              style={{ padding: '12px 16px' }}
            />
          </div>

          <button
            type="submit"
            className="btn btn-primary"
            style={{ width: '100%', padding: '12px', marginTop: 'var(--space-2)', fontSize: '0.95rem' }}
            disabled={loading}
          >
            {loading ? 'Verifying Credentials...' : 'Access Dashboard'}
          </button>
        </form>

        <div style={{ marginTop: 'var(--space-8)', borderTop: '1px solid var(--border-secondary)', paddingTop: 'var(--space-4)', textAlign: 'center' }}>
          <p style={{ fontSize: '0.775rem', color: 'var(--text-muted)' }}>
            Smart Visitor Management System console access is audited. Unauthorized attempts are logged.
          </p>
        </div>
      </div>

      {/* RIGHT VISUAL PANE */}
      <div style={{
        flex: '1 1 50%',
        background: 'radial-gradient(circle at top right, var(--primary-light), var(--bg-app))',
        borderLeft: '1px solid var(--border-primary)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 'var(--space-12)',
        position: 'relative',
        overflow: 'hidden',
      }}>
        {/* Abstract decorative grid */}
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundImage: 'radial-gradient(circle, var(--border-primary) 1px, transparent 1px)',
          backgroundSize: '24px 24px',
          opacity: 0.4,
          pointerEvents: 'none',
        }} />

        {/* Decorative ambient blobs */}
        <div style={{
          position: 'absolute',
          top: '20%',
          right: '10%',
          width: '300px',
          height: '300px',
          borderRadius: 'var(--radius-full)',
          background: 'var(--primary-light)',
          filter: 'blur(80px)',
          opacity: 0.6,
          zIndex: 0,
        }} />

        {/* Mock Glassmorphic Dashboard Panel */}
        <div className="card glass-panel" style={{
          width: '100%',
          maxWidth: '440px',
          padding: 'var(--space-6)',
          borderRadius: 'var(--radius-xl)',
          border: '1px solid rgba(255, 255, 255, 0.4)',
          boxShadow: 'var(--shadow-xl)',
          zIndex: 1,
          animation: 'fadeIn 0.6s ease-out',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-6)' }}>
            <div style={{ display: 'flex', gap: '6px' }}>
              <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#EF4444' }} />
              <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#F59E0B' }} />
              <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#10B981' }} />
            </div>
            <span style={{ fontSize: '0.7rem', fontWeight: 'bold', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              LIVE MONITOR
            </span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>TODAY'S REGISTRATIONS</div>
                <div style={{ fontSize: '1.5rem', fontWeight: 'var(--weight-extrabold)', color: 'var(--text-primary)', marginTop: '2px' }}>148 Visitors</div>
              </div>
              <span className="kpi-trend up">+12.4%</span>
            </div>

            {/* Simulated graph graphic */}
            <div style={{ height: '60px', width: '100%', display: 'flex', alignItems: 'flex-end', gap: '10px', padding: '10px 0' }}>
              <div style={{ height: '30%', flex: 1, backgroundColor: 'var(--primary)', opacity: 0.3, borderRadius: '3px' }} />
              <div style={{ height: '50%', flex: 1, backgroundColor: 'var(--primary)', opacity: 0.4, borderRadius: '3px' }} />
              <div style={{ height: '40%', flex: 1, backgroundColor: 'var(--primary)', opacity: 0.5, borderRadius: '3px' }} />
              <div style={{ height: '70%', flex: 1, backgroundColor: 'var(--primary)', opacity: 0.7, borderRadius: '3px' }} />
              <div style={{ height: '60%', flex: 1, backgroundColor: 'var(--primary)', opacity: 0.8, borderRadius: '3px' }} />
              <div style={{ height: '90%', flex: 1, backgroundColor: 'var(--primary)', borderRadius: '3px' }} />
            </div>

            {/* List entries */}
            <div style={{ borderTop: '1px solid var(--border-secondary)', paddingTop: 'var(--space-4)', display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem' }}>
                <span style={{ fontWeight: '600', color: 'var(--text-primary)' }}>Sarah Jenkins</span>
                <span className="badge badge-approved" style={{ fontSize: '0.65rem' }}>Approved</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem' }}>
                <span style={{ fontWeight: '600', color: 'var(--text-primary)' }}>David Vance</span>
                <span className="badge badge-checked-out" style={{ fontSize: '0.65rem' }}>Checked-Out</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
