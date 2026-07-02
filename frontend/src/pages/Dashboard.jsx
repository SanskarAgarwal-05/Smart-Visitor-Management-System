import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api from '../api/api';
import VisitorForm from '../components/VisitorForm';
import AnalyticsCharts from '../components/AnalyticsCharts';

const Dashboard = () => {
  const [visitors, setVisitors] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const navigate = useNavigate();

  const fetchVisitors = async () => {
    try {
      setLoading(true);
      setError('');
      const response = await api.get('/visitor');
      setVisitors(response.data.visitors || []);
    } catch (err) {
      console.error(err);
      if (err.response?.status === 401) {
        localStorage.removeItem('adminToken');
        navigate('/login');
      } else {
        setError('Failed to fetch visitor statistics.');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const res = await api.get('/admin/me');
        setCurrentUser(res.data?.admin || null);
      } catch (err) {
        console.error('Failed to load user session', err);
      }
    };
    fetchUserData();
    fetchVisitors();
  }, [navigate]);

  const handleCheckOut = async (id) => {
    try {
      await api.put(`/visitor/${id}`, { status: 'checked-out' });
      fetchVisitors(); // refresh list
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.message || 'Failed to check out visitor.');
    }
  };

  const handleStatusUpdate = async (id, newStatus) => {
    try {
      await api.put(`/visitor/${id}`, { status: newStatus });
      fetchVisitors(); // refresh list
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.message || 'Failed to update visitor status.');
    }
  };

  const handleSaveVisitor = (newVisitor) => {
    setShowAddModal(false);
    fetchVisitors(); // Refresh list to get new metrics and updated table
  };

  // Compute metrics
  const totalCount = visitors.length;
  const pendingCount = visitors.filter((v) => v.status === 'pending').length;
  const approvedCount = visitors.filter((v) => v.status === 'approved').length;
  const checkedOutCount = visitors.filter((v) => v.status === 'checked-out').length;
  
  // Calculate Today's Visitors based on local checkInTime date
  const todayCount = visitors.filter((v) => {
    const checkInDate = new Date(v.checkInTime).toDateString();
    const todayDate = new Date().toDateString();
    return checkInDate === todayDate;
  }).length;
  
  // Helper for relative time formatting
  const formatTimeAgo = (dateStr) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays}d ago`;
  };

  // Generate activities dynamically from visitor status transitions
  const getRecentActivities = () => {
    // Sort visitors by updatedAt or createdAt desc
    const sorted = [...visitors].sort((a, b) => {
      const dateA = new Date(b.updatedAt || b.createdAt || 0);
      const dateB = new Date(a.updatedAt || a.createdAt || 0);
      return dateA - dateB;
    });

    return sorted.slice(0, 5).map((v) => {
      let actionText = '';
      let statusColor = '';
      let badgeBg = '';

      switch (v.status) {
        case 'pending':
          actionText = `Registered: ${v.fullName} is awaiting approval.`;
          statusColor = 'var(--accent-orange)';
          badgeBg = 'rgba(245, 158, 11, 0.15)';
          break;
        case 'approved':
          actionText = `Approved: ${v.fullName} has been checked in.`;
          statusColor = 'var(--primary)';
          badgeBg = 'var(--primary-light)';
          break;
        case 'rejected':
          actionText = `Rejected: ${v.fullName} was denied access.`;
          statusColor = 'var(--color-danger)';
          badgeBg = 'var(--color-danger-bg)';
          break;
        case 'checked-out':
          actionText = `Checked Out: ${v.fullName} has departed.`;
          statusColor = 'var(--color-success)';
          badgeBg = 'var(--color-success-bg)';
          break;
        default:
          actionText = `Activity update: ${v.fullName}`;
          statusColor = 'var(--text-secondary)';
          badgeBg = 'var(--border-secondary)';
      }

      return {
        id: v._id || v.visitorId,
        text: actionText,
        statusColor,
        badgeBg,
        timeAgo: formatTimeAgo(v.updatedAt || v.createdAt),
      };
    });
  };

  const recentActivities = getRecentActivities();

  const canVerify = currentUser?.role === 'admin' || currentUser?.role === 'security';

  return (
    <div style={{ animation: 'fadeIn var(--transition-normal) ease-out' }}>
      {/* Header Block */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 'var(--space-6)',
        flexWrap: 'wrap',
        gap: 'var(--space-4)'
      }}>
        <div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 'var(--weight-extrabold)', color: 'var(--text-primary)' }}>Visitor Dashboard</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginTop: '2px' }}>
            Real-time facility check-in tracking and authorization control console.
          </p>
        </div>
      </div>

      {error && <div className="alert alert-danger">{error}</div>}

      {/* KPI METRIC GRID */}
      <div className="kpi-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 'var(--space-4)', marginBottom: 'var(--space-6)' }}>
        {/* Total Visitors */}
        <div className="card kpi-card card-hoverable" style={{ padding: 'var(--space-5)', minHeight: '130px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div className="kpi-header" style={{ marginBottom: 'var(--space-2)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span className="kpi-title" style={{ fontSize: '0.75rem', fontWeight: 'var(--weight-bold)', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Total Visitors</span>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.6, color: 'var(--text-muted)' }}>
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
              <path d="M16 3.13a4 4 0 0 1 0 7.75" />
            </svg>
          </div>
          <div className="kpi-body" style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 'var(--space-2)' }}>
            <span className="kpi-value" style={{ fontSize: '2.25rem', fontWeight: 'var(--weight-extrabold)', color: 'var(--text-primary)', lineHeight: 1 }}>{loading ? '...' : totalCount}</span>
            <span className="kpi-trend neutral" style={{ fontSize: '0.725rem', fontWeight: 'var(--weight-semibold)', padding: '2px 8px', borderRadius: '4px' }}>Cumulative</span>
          </div>
        </div>

        {/* Approved */}
        <div className="card kpi-card card-hoverable" style={{ padding: 'var(--space-5)', minHeight: '130px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div className="kpi-header" style={{ marginBottom: 'var(--space-2)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span className="kpi-title" style={{ fontSize: '0.75rem', fontWeight: 'var(--weight-bold)', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Approved</span>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.6, color: 'var(--text-muted)' }}>
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
              <polyline points="22 4 12 14.01 9 11.01" />
            </svg>
          </div>
          <div className="kpi-body" style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 'var(--space-2)' }}>
            <span className="kpi-value" style={{ fontSize: '2.25rem', fontWeight: 'var(--weight-extrabold)', color: 'var(--text-primary)', lineHeight: 1 }}>{loading ? '...' : approvedCount}</span>
            <span className="kpi-trend up" style={{ fontSize: '0.725rem', fontWeight: 'var(--weight-semibold)', padding: '2px 8px', borderRadius: '4px' }}>Authorized</span>
          </div>
        </div>

        {/* Pending */}
        <div className="card kpi-card card-hoverable" style={{ padding: 'var(--space-5)', minHeight: '130px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div className="kpi-header" style={{ marginBottom: 'var(--space-2)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span className="kpi-title" style={{ fontSize: '0.75rem', fontWeight: 'var(--weight-bold)', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Pending</span>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.6, color: 'var(--text-muted)' }}>
              <circle cx="12" cy="12" r="10" />
              <polyline points="12 6 12 12 16 14" />
            </svg>
          </div>
          <div className="kpi-body" style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 'var(--space-2)' }}>
            <span className="kpi-value" style={{ fontSize: '2.25rem', fontWeight: 'var(--weight-extrabold)', color: 'var(--text-primary)', lineHeight: 1 }}>{loading ? '...' : pendingCount}</span>
            <span className={`kpi-trend ${pendingCount > 0 ? 'down' : 'neutral'}`} style={{ fontSize: '0.725rem', fontWeight: 'var(--weight-semibold)', padding: '2px 8px', borderRadius: '4px' }}>
              {pendingCount > 0 ? 'Action Reqd' : 'No backlog'}
            </span>
          </div>
        </div>

        {/* Checked Out */}
        <div className="card kpi-card card-hoverable" style={{ padding: 'var(--space-5)', minHeight: '130px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div className="kpi-header" style={{ marginBottom: 'var(--space-2)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span className="kpi-title" style={{ fontSize: '0.75rem', fontWeight: 'var(--weight-bold)', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Checked Out</span>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.6, color: 'var(--text-muted)' }}>
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
              <polyline points="16 17 21 12 16 7" />
              <line x1="21" y1="12" x2="9" y2="12" />
            </svg>
          </div>
          <div className="kpi-body" style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 'var(--space-2)' }}>
            <span className="kpi-value" style={{ fontSize: '2.25rem', fontWeight: 'var(--weight-extrabold)', color: 'var(--text-primary)', lineHeight: 1 }}>{loading ? '...' : checkedOutCount}</span>
            <span className="kpi-trend up" style={{ fontSize: '0.725rem', fontWeight: 'var(--weight-semibold)', padding: '2px 8px', borderRadius: '4px' }}>Completed</span>
          </div>
        </div>

        {/* Today's Visitors */}
        <div className="card kpi-card card-hoverable" style={{ padding: 'var(--space-5)', minHeight: '130px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div className="kpi-header" style={{ marginBottom: 'var(--space-2)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span className="kpi-title" style={{ fontSize: '0.75rem', fontWeight: 'var(--weight-bold)', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Today's Visitors</span>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.6, color: 'var(--text-muted)' }}>
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
              <line x1="16" y1="2" x2="16" y2="6" />
              <line x1="8" y1="2" x2="8" y2="6" />
              <line x1="3" y1="10" x2="21" y2="10" />
            </svg>
          </div>
          <div className="kpi-body" style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 'var(--space-2)' }}>
            <span className="kpi-value" style={{ fontSize: '2.25rem', fontWeight: 'var(--weight-extrabold)', color: 'var(--text-primary)', lineHeight: 1 }}>{loading ? '...' : todayCount}</span>
            <span className="kpi-trend up" style={{ fontSize: '0.725rem', fontWeight: 'var(--weight-semibold)', padding: '2px 8px', borderRadius: '4px' }}>Active today</span>
          </div>
        </div>
      </div>

      {/* BOTTOM LAYOUT GRID */}
      {!loading && (
        <div className="bottom-dashboard-grid" style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', 
          gap: 'var(--space-6)',
          marginTop: 'var(--space-6)',
          marginBottom: 'var(--space-6)'
        }}>
          {/* Recent Activity Panel */}
          <div className="card" style={{ padding: 'var(--space-6)', display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-secondary)', paddingBottom: 'var(--space-3)' }}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 'var(--weight-extrabold)', color: 'var(--text-primary)' }}>Recent Activity</h3>
              <span style={{ fontSize: '0.725rem', color: 'var(--text-muted)', fontWeight: 'var(--weight-semibold)', background: 'var(--border-secondary)', padding: '2px 8px', borderRadius: '4px' }}>Live log feed</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)', marginTop: 'var(--space-2)' }}>
              {recentActivities.length === 0 ? (
                <div style={{ color: 'var(--text-muted)', fontSize: '0.875rem', textAlign: 'center', padding: 'var(--space-6)' }}>No recent activity.</div>
              ) : (
                recentActivities.map((act) => (
                  <div key={act.id} style={{ display: 'flex', gap: 'var(--space-3)', alignItems: 'flex-start' }}>
                    <div style={{
                      width: '8px',
                      height: '8px',
                      borderRadius: '50%',
                      backgroundColor: act.statusColor,
                      marginTop: '6px',
                      flexShrink: 0,
                      boxShadow: `0 0 0 4px ${act.badgeBg}`
                    }} />
                    <div style={{ flex: 1, display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 'var(--space-2)' }}>
                      <span style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', fontWeight: 'var(--weight-semibold)' }}>{act.text}</span>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', flexShrink: 0 }}>{act.timeAgo}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Quick Actions Section */}
          <div className="card" style={{ padding: 'var(--space-6)', display: 'flex', flexDirection: 'column', gap: 'var(--space-4)', height: 'fit-content' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 'var(--weight-extrabold)', color: 'var(--text-primary)', borderBottom: '1px solid var(--border-secondary)', paddingBottom: 'var(--space-3)' }}>Quick Actions</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-4)' }}>
              {currentUser?.role !== 'security' && (
                <button 
                  onClick={() => navigate('/register')}
                  className="btn btn-outline" 
                  style={{ 
                    display: 'flex', 
                    flexDirection: 'column', 
                    alignItems: 'center', 
                    justifyContent: 'center', 
                    padding: 'var(--space-4)', 
                    gap: 'var(--space-2)',
                    height: '100%',
                    textAlign: 'center',
                    borderColor: 'var(--border-primary)',
                    borderRadius: 'var(--radius-md)'
                  }}
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                    <circle cx="9" cy="7" r="4" />
                    <line x1="19" y1="8" x2="19" y2="14" />
                    <line x1="16" y1="11" x2="22" y2="11" />
                  </svg>
                  <span style={{ fontSize: '0.8rem', fontWeight: 'var(--weight-bold)' }}>Register Visitor</span>
                </button>
              )}
              <button 
                onClick={() => navigate('/visitors')}
                className="btn btn-outline" 
                style={{ 
                  display: 'flex', 
                  flexDirection: 'column', 
                  alignItems: 'center', 
                  justifyContent: 'center', 
                  padding: 'var(--space-4)', 
                  gap: 'var(--space-2)',
                  gridColumn: currentUser?.role === 'security' ? 'span 2' : 'span 1',
                  height: '100%',
                  textAlign: 'center',
                  borderColor: 'var(--border-primary)',
                  borderRadius: 'var(--radius-md)'
                }}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="8" y1="6" x2="21" y2="6" />
                  <line x1="8" y1="12" x2="21" y2="12" />
                  <line x1="8" y1="18" x2="21" y2="18" />
                  <line x1="3" y1="6" x2="3.01" y2="6" />
                  <line x1="3" y1="12" x2="3.01" y2="12" />
                  <line x1="3" y1="18" x2="3.01" y2="18" />
                </svg>
                <span style={{ fontSize: '0.8rem', fontWeight: 'var(--weight-bold)' }}>View Visitor List</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DETAILED STATS (CHARTS) */}
      {!loading && <AnalyticsCharts visitors={visitors} />}
      {/* REGISTER VISITOR MODAL */}
      {showAddModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <span className="modal-title">Register New Visitor</span>
              <button className="modal-close" onClick={() => setShowAddModal(false)}>×</button>
            </div>
            <div className="modal-body">
              <VisitorForm 
                onSave={handleSaveVisitor} 
                onClose={() => setShowAddModal(false)} 
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
