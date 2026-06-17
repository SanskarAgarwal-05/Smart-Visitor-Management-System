import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api from '../api/api';
import VisitorForm from '../components/VisitorForm';
import AnalyticsCharts from '../components/AnalyticsCharts';

const Dashboard = () => {
  const [visitors, setVisitors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const navigate = useNavigate();

  const fetchVisitors = async () => {
    try {
      setLoading(true);
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
  
  // Recent 5 visitors
  const recentVisitors = visitors.slice(0, 5);

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
        <button className="btn btn-primary" onClick={() => setShowAddModal(true)}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          Register Visitor
        </button>
      </div>

      {error && <div className="alert alert-danger">{error}</div>}

      {/* KPI METRIC GRID */}
      <div className="kpi-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 'var(--space-4)', marginBottom: 'var(--space-6)' }}>
        {/* Total Visitors */}
        <div className="card kpi-card card-hoverable">
          <div className="kpi-header">
            <span className="kpi-title">Total Visitors</span>
            <div className="kpi-icon-wrapper" style={{ backgroundColor: 'var(--accent-blue-light)', color: 'var(--accent-blue)' }}>
              👥
            </div>
          </div>
          <div className="kpi-body">
            <span className="kpi-value">{loading ? '...' : totalCount}</span>
            <span className="kpi-trend neutral">Cumulative</span>
          </div>
        </div>

        {/* Approved */}
        <div className="card kpi-card card-hoverable">
          <div className="kpi-header">
            <span className="kpi-title">Approved</span>
            <div className="kpi-icon-wrapper" style={{ backgroundColor: 'var(--primary-light)', color: 'var(--primary)' }}>
              ✅
            </div>
          </div>
          <div className="kpi-body">
            <span className="kpi-value">{loading ? '...' : approvedCount}</span>
            <span className="kpi-trend up">Authorized</span>
          </div>
        </div>

        {/* Pending */}
        <div className="card kpi-card card-hoverable">
          <div className="kpi-header">
            <span className="kpi-title">Pending</span>
            <div className="kpi-icon-wrapper" style={{ backgroundColor: 'var(--accent-orange-light)', color: 'var(--accent-orange)' }}>
              ⏳
            </div>
          </div>
          <div className="kpi-body">
            <span className="kpi-value">{loading ? '...' : pendingCount}</span>
            <span className={`kpi-trend ${pendingCount > 0 ? 'down' : 'neutral'}`}>
              {pendingCount > 0 ? 'Action Reqd' : 'No backlog'}
            </span>
          </div>
        </div>

        {/* Checked Out */}
        <div className="card kpi-card card-hoverable">
          <div className="kpi-header">
            <span className="kpi-title">Checked Out</span>
            <div className="kpi-icon-wrapper" style={{ backgroundColor: 'var(--color-success-bg)', color: 'var(--color-success)' }}>
              🚪
            </div>
          </div>
          <div className="kpi-body">
            <span className="kpi-value">{loading ? '...' : checkedOutCount}</span>
            <span className="kpi-trend up">Completed</span>
          </div>
        </div>

        {/* Today's Visitors */}
        <div className="card kpi-card card-hoverable">
          <div className="kpi-header">
            <span className="kpi-title">Today's Visitors</span>
            <div className="kpi-icon-wrapper" style={{ backgroundColor: 'var(--accent-gold-light)', color: 'var(--accent-gold)' }}>
              📅
            </div>
          </div>
          <div className="kpi-body">
            <span className="kpi-value">{loading ? '...' : todayCount}</span>
            <span className="kpi-trend up">Active today</span>
          </div>
        </div>
      </div>

      {/* DETAILED STATS (CHARTS) */}
      {!loading && <AnalyticsCharts visitors={visitors} />}

      {/* RECENT ACTIVITY SUMMARY */}
      <div className="card" style={{ marginTop: 'var(--space-6)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-5)' }}>
          <div>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 'var(--weight-extrabold)', color: 'var(--text-primary)' }}>Recent Visitor Logs</h3>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Latest entries registered in the database.</p>
          </div>
          <Link to="/visitors" className="btn btn-secondary btn-sm" style={{ textDecoration: 'none' }}>
            View All Logs →
          </Link>
        </div>

        {loading ? (
          <div style={{ padding: 'var(--space-8)', textAlign: 'center', color: 'var(--text-muted)' }}>Syncing logs...</div>
        ) : recentVisitors.length === 0 ? (
          <div style={{ padding: 'var(--space-8)', textAlign: 'center', color: 'var(--text-muted)' }}>No visitors logged. Register a visitor to begin.</div>
        ) : (
          <div className="table-wrapper">
            <table className="table">
              <thead>
                <tr>
                  <th>Visitor ID</th>
                  <th>Full Name</th>
                  <th>Person to Meet</th>
                  <th>Purpose</th>
                  <th>Check-In Time</th>
                  <th>Status</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {recentVisitors.map((v) => (
                  <tr key={v._id || v.visitorId}>
                    <td style={{ fontWeight: 'var(--weight-bold)', color: 'var(--primary)' }}>{v.visitorId}</td>
                    <td style={{ fontWeight: 'var(--weight-semibold)' }}>{v.fullName}</td>
                    <td>{v.personToMeet}</td>
                    <td>{v.purposeOfVisit}</td>
                    <td style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                      {new Date(v.checkInTime).toLocaleString()}
                    </td>
                    <td>
                      <span className={`badge badge-${v.status}`}>
                        {v.status}
                      </span>
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: 'var(--space-2)', justifyContent: 'flex-end' }}>
                        {v.status === 'pending' && (
                          <>
                            <button
                              onClick={() => handleStatusUpdate(v._id || v.visitorId, 'approved')}
                              className="btn btn-primary btn-sm"
                            >
                              Approve
                            </button>
                            <button
                              onClick={() => handleStatusUpdate(v._id || v.visitorId, 'rejected')}
                              className="btn btn-outline btn-sm"
                            >
                              Reject
                            </button>
                          </>
                        )}
                        {v.status === 'approved' && (
                          <button
                            onClick={() => handleCheckOut(v._id || v.visitorId)}
                            className="btn btn-success btn-sm"
                          >
                            Check Out
                          </button>
                        )}
                        {v.status === 'checked-out' && (
                          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                            Checked Out {new Date(v.checkOutTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        )}
                        {v.status === 'rejected' && (
                          <span style={{ fontSize: '0.75rem', color: 'var(--color-danger)' }}>
                            Rejected
                          </span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

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
