import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/api';
import VisitorForm from '../components/VisitorForm';

const VisitorList = () => {
  const [visitors, setVisitors] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [localSearch, setLocalSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  
  // Modals state
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingVisitor, setEditingVisitor] = useState(null);
  const [viewingVisitor, setViewingVisitor] = useState(null);

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
        setError('Failed to fetch visitor logs from the database.');
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
        console.error('Failed to load user session info', err);
      }
    };
    fetchUserData();
    fetchVisitors();
  }, [navigate]);

  const handleStatusUpdate = async (id, newStatus) => {
    try {
      // Optimistically update the status locally to make UI instant
      setVisitors((prev) =>
        prev.map((v) => (v._id === id ? { ...v, status: newStatus } : v))
      );
      
      const response = await api.put(`/visitor/${id}`, { status: newStatus });
      
      // Merge backend response (which contains automatic checkOutTime and timestamps)
      if (response.data?.visitor) {
        setVisitors((prev) =>
          prev.map((v) => (v._id === id ? response.data.visitor : v))
        );
        // If we are currently viewing this visitor, update the details modal too
        if (viewingVisitor && viewingVisitor._id === id) {
          setViewingVisitor(response.data.visitor);
        }
      }
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.message || 'Failed to update visitor status.');
      // Revert status on failure by refetching
      fetchVisitors();
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to permanently delete this visitor record?')) {
      return;
    }
    
    try {
      await api.delete(`/visitor/${id}`);
      setVisitors((prev) => prev.filter((v) => v._id !== id));
      if (viewingVisitor && viewingVisitor._id === id) {
        setViewingVisitor(null);
      }
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.message || 'Failed to delete visitor record.');
    }
  };

  const handleSaveVisitor = () => {
    setShowAddForm(false);
    setEditingVisitor(null);
    fetchVisitors();
  };

  // Safe search & filtering logic to prevent crashes with undefined data
  const filteredVisitors = visitors.filter((v) => {
    const nameMatch = (v.fullName || '').toLowerCase().includes(localSearch.toLowerCase());
    const idMatch = (v.visitorId || '').toLowerCase().includes(localSearch.toLowerCase());
    const phoneMatch = (v.phoneNumber || '').toLowerCase().includes(localSearch.toLowerCase());
    
    const matchesSearch = nameMatch || idMatch || phoneMatch;
    const matchesStatus = statusFilter === '' || v.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const formatTimeOnly = (dateStr) => {
    if (!dateStr) return '-';
    const d = new Date(dateStr);
    return isNaN(d.getTime()) ? '-' : d.toLocaleTimeString(undefined, { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  const formatDateOnly = (dateStr) => {
    if (!dateStr) return '-';
    const d = new Date(dateStr);
    return isNaN(d.getTime()) ? '-' : d.toLocaleDateString(undefined, { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric' 
    });
  };

  const formatDateTime = (dateStr) => {
    if (!dateStr) return '-';
    const d = new Date(dateStr);
    return isNaN(d.getTime()) ? '-' : `${formatDateOnly(dateStr)} • ${formatTimeOnly(dateStr)}`;
  };

  const getAuditInfo = (auditObj, timestamp) => {
    if (auditObj && auditObj.name) {
      return (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', width: '100%', gap: '8px' }}>
          <div>
            <div style={{ fontSize: '0.875rem', fontWeight: 'var(--weight-semibold)', color: 'var(--text-primary)', marginTop: '2px' }}>
              {auditObj.name} <span style={{ color: 'var(--primary)', fontWeight: 'var(--weight-medium)' }}>({auditObj.role || 'User'})</span>
            </div>
          </div>
          {timestamp && (
            <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', textAlign: 'right', flexShrink: 0 }}>
              {formatDateTime(timestamp)}
            </div>
          )}
        </div>
      );
    }
    return (
      <div style={{ fontSize: '0.875rem', color: 'var(--text-muted)', fontStyle: 'italic', marginTop: '2px' }}>
        Not Available
      </div>
    );
  };

  const canRegister = currentUser?.role === 'admin' || currentUser?.role === 'receptionist';
  const canVerify = currentUser?.role === 'admin' || currentUser?.role === 'security';
  const canEditInfo = currentUser?.role === 'admin' || currentUser?.role === 'receptionist';
  const canDeleteInfo = currentUser?.role === 'admin';

  return (
    <div style={{ animation: 'fadeIn var(--transition-normal) ease-out' }}>
      {/* Header */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 'var(--space-6)',
        flexWrap: 'wrap',
        gap: 'var(--space-4)'
      }}>
        <div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 'var(--weight-extrabold)', color: 'var(--text-primary)' }}>Visitor Log Database</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginTop: '2px' }}>
            Browse, search, and manage statuses for all visitor registrations.
          </p>
        </div>
        {canRegister && (
          <button className="btn btn-primary" onClick={() => setShowAddForm(true)}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ marginRight: '6px' }}>
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            Register Visitor
          </button>
        )}
      </div>

      {error && <div className="alert alert-danger">{error}</div>}

      {/* Filters Bar */}
      <div style={{
        display: 'flex',
        gap: 'var(--space-4)',
        marginBottom: 'var(--space-5)',
        flexWrap: 'wrap',
        backgroundColor: 'var(--bg-card)',
        padding: 'var(--space-4)',
        borderRadius: 'var(--radius-lg)',
        border: '1px solid var(--border-primary)',
        alignItems: 'center'
      }}>
        <div style={{ flex: '2 1 300px', position: 'relative' }}>
          <label className="form-label" style={{ fontSize: '0.75rem' }}>Search visitor database</label>
          <input
            type="text"
            className="form-control"
            placeholder="Search by Visitor Name, ID, or Phone number..."
            value={localSearch}
            onChange={(e) => setLocalSearch(e.target.value)}
          />
        </div>

        <div style={{ flex: '1 1 200px' }}>
          <label className="form-label" style={{ fontSize: '0.75rem' }}>Status Filter</label>
          <select
            className="form-control"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="">All Statuses</option>
            <option value="pending">Pending Approval</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
            <option value="checked-out">Checked Out</option>
          </select>
        </div>
      </div>

      {/* Main Database Table */}
      <div className="card" style={{ padding: 0 }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: 'var(--space-12)', color: 'var(--text-muted)' }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" style={{ animation: 'spin 1s linear infinite', marginBottom: '8px', display: 'inline-block' }}>
              <circle cx="12" cy="12" r="10" strokeDasharray="32" />
            </svg>
            <div>Loading visitor records...</div>
          </div>
        ) : filteredVisitors.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 'var(--space-12)', color: 'var(--text-muted)' }}>
            No visitor logs match your search details.
          </div>
        ) : (
          <div className="table-wrapper">
            <table className="table">
              <thead>
                <tr>
                  <th>Visitor ID</th>
                  <th>Visitor Name</th>
                  <th>Status</th>
                  <th>Check-In Time</th>
                  <th>Check-Out Time</th>
                  <th>Date</th>
                  <th>Activity History</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredVisitors.map((v) => (
                  <tr key={v._id || v.visitorId}>
                    <td style={{ fontWeight: 'var(--weight-bold)', color: 'var(--primary)' }}>{v.visitorId}</td>
                    <td>
                      <div style={{ fontWeight: 'var(--weight-semibold)' }}>{v.fullName}</div>
                    </td>
                    <td>
                      {canVerify ? (
                        <select
                          value={v.status}
                          onChange={(e) => handleStatusUpdate(v._id || v.visitorId, e.target.value)}
                          className={`status-select status-select-${v.status}`}
                        >
                          <option value="pending">Pending</option>
                          <option value="approved">Approved</option>
                          <option value="rejected">Rejected</option>
                          <option value="checked-out">Checked-Out</option>
                        </select>
                      ) : (
                        <span className={`badge badge-${v.status}`}>
                          {v.status}
                        </span>
                      )}
                    </td>
                    <td style={{ fontSize: '0.825rem', color: 'var(--text-secondary)' }}>
                      {formatTimeOnly(v.checkInTime)}
                    </td>
                    <td style={{ fontSize: '0.825rem', color: 'var(--text-secondary)' }}>
                      {formatTimeOnly(v.checkOutTime)}
                    </td>
                    <td style={{ fontSize: '0.825rem', color: 'var(--text-secondary)' }}>
                      {formatDateOnly(v.createdAt || v.checkInTime)}
                    </td>
                    <td style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                      {v.lastUpdatedBy ? `Updated by ${v.lastUpdatedBy}` : 'Initial check-in'}
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: 'var(--space-15)', justifyContent: 'flex-end', alignItems: 'center' }}>
                        {canVerify && (
                          <>
                            <button
                              onClick={() => handleStatusUpdate(v._id || v.visitorId, 'approved')}
                              className="btn btn-success btn-sm"
                              disabled={v.status === 'approved'}
                              title="Approve Visit"
                            >
                              Approve
                            </button>
                            <button
                              onClick={() => handleStatusUpdate(v._id || v.visitorId, 'rejected')}
                              className="btn btn-outline btn-sm"
                              style={{ borderColor: 'var(--color-danger)', color: 'var(--color-danger)' }}
                              disabled={v.status === 'rejected'}
                              title="Reject Visit"
                            >
                              Reject
                            </button>
                          </>
                        )}
                        <button
                          onClick={() => setViewingVisitor(v)}
                          className="btn btn-outline btn-sm"
                          style={{ borderColor: 'var(--primary)', color: 'var(--primary)' }}
                          title="View Details"
                        >
                          Details
                        </button>
                        {canEditInfo && (
                          <button
                            onClick={() => setEditingVisitor(v)}
                            className="btn btn-outline btn-sm"
                            title="Edit Visitor Info"
                          >
                            Edit
                          </button>
                        )}
                        {canDeleteInfo && (
                          <button
                            onClick={() => handleDelete(v._id || v.visitorId)}
                            className="btn btn-danger btn-sm"
                            title="Delete Record"
                          >
                            Delete
                          </button>
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

      {/* Add Visitor Modal */}
      {showAddForm && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <span className="modal-title">Register New Visitor</span>
              <button className="modal-close" onClick={() => setShowAddForm(false)}>×</button>
            </div>
            <div className="modal-body">
              <VisitorForm 
                onSave={handleSaveVisitor} 
                onClose={() => setShowAddForm(false)} 
              />
            </div>
          </div>
        </div>
      )}

      {/* Edit Visitor Modal */}
      {editingVisitor && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <span className="modal-title">Edit Details: {editingVisitor.visitorId}</span>
              <button className="modal-close" onClick={() => setEditingVisitor(null)}>×</button>
            </div>
            <div className="modal-body">
              <VisitorForm 
                visitor={editingVisitor}
                onSave={handleSaveVisitor} 
                onClose={() => setEditingVisitor(null)} 
              />
            </div>
          </div>
        </div>
      )}

      {/* Visitor Details Modal */}
      {viewingVisitor && (
        <div className="modal-overlay" onClick={() => setViewingVisitor(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '550px' }}>
            <div className="modal-header" style={{ borderBottom: '1px solid var(--border-primary)', padding: 'var(--space-4) var(--space-5)' }}>
              <span className="modal-title" style={{ fontSize: '1.2rem', fontWeight: 'var(--weight-extrabold)', color: 'var(--text-primary)' }}>
                Visitor Details Profile
              </span>
              <button className="modal-close" onClick={() => setViewingVisitor(null)}>×</button>
            </div>
            <div className="modal-body" style={{ padding: 'var(--space-5) var(--space-6)', display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
              
              {/* ID and Status badge */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: 'var(--bg-app)', padding: 'var(--space-3) var(--space-4)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-primary)' }}>
                <div>
                  <span style={{ fontSize: '0.7rem', fontWeight: 'var(--weight-bold)', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Visitor ID</span>
                  <div style={{ fontSize: '1.1rem', fontWeight: 'var(--weight-extrabold)', color: 'var(--primary)', marginTop: '2px' }}>{viewingVisitor.visitorId}</div>
                </div>
                <div>
                  <span style={{ fontSize: '0.7rem', fontWeight: 'var(--weight-bold)', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', textAlign: 'right', marginBottom: '4px' }}>Status</span>
                  <span className={`badge badge-${viewingVisitor.status}`}>
                    {viewingVisitor.status}
                  </span>
                </div>
              </div>

              {/* Grid of information */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-4)', marginTop: 'var(--space-2)' }}>
                <div>
                  <span style={{ fontSize: '0.7rem', fontWeight: 'var(--weight-bold)', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.02em' }}>Full Name</span>
                  <div style={{ fontSize: '0.925rem', fontWeight: 'var(--weight-semibold)', color: 'var(--text-primary)', marginTop: '4px' }}>{viewingVisitor.fullName}</div>
                </div>
                <div>
                  <span style={{ fontSize: '0.7rem', fontWeight: 'var(--weight-bold)', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.02em' }}>Phone Number</span>
                  <div style={{ fontSize: '0.925rem', fontWeight: 'var(--weight-semibold)', color: 'var(--text-primary)', marginTop: '4px' }}>{viewingVisitor.phoneNumber}</div>
                </div>
                <div style={{ gridColumn: 'span 2' }}>
                  <span style={{ fontSize: '0.7rem', fontWeight: 'var(--weight-bold)', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.02em' }}>Email Address</span>
                  <div style={{ fontSize: '0.925rem', fontWeight: 'var(--weight-semibold)', color: 'var(--text-primary)', marginTop: '4px' }}>{viewingVisitor.email || <span style={{ fontStyle: 'italic', color: 'var(--text-muted)' }}>Not Provided</span>}</div>
                </div>
                <div>
                  <span style={{ fontSize: '0.7rem', fontWeight: 'var(--weight-bold)', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.02em' }}>Person To Meet</span>
                  <div style={{ fontSize: '0.925rem', fontWeight: 'var(--weight-semibold)', color: 'var(--text-primary)', marginTop: '4px' }}>{viewingVisitor.personToMeet}</div>
                </div>
                <div>
                  <span style={{ fontSize: '0.7rem', fontWeight: 'var(--weight-bold)', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.02em' }}>Purpose of Visit</span>
                  <div style={{ fontSize: '0.925rem', fontWeight: 'var(--weight-semibold)', color: 'var(--text-primary)', marginTop: '4px' }}>{viewingVisitor.purposeOfVisit}</div>
                </div>
                <div>
                  <span style={{ fontSize: '0.7rem', fontWeight: 'var(--weight-bold)', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.02em' }}>Registration Date</span>
                  <div style={{ fontSize: '0.85rem', color: 'var(--text-primary)', marginTop: '4px', fontWeight: 'var(--weight-medium)' }}>
                    {formatDateTime(viewingVisitor.createdAt || viewingVisitor.checkInTime)}
                  </div>
                </div>
                <div>
                  <span style={{ fontSize: '0.7rem', fontWeight: 'var(--weight-bold)', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.02em' }}>Last Updated Date</span>
                  <div style={{ fontSize: '0.85rem', color: 'var(--text-primary)', marginTop: '4px', fontWeight: 'var(--weight-medium)' }}>
                    {formatDateTime(viewingVisitor.updatedAt || viewingVisitor.createdAt || viewingVisitor.checkInTime)}
                  </div>
                </div>
              </div>

              {/* Activity History Section */}
              <div style={{ 
                borderTop: '1px solid var(--border-primary)', 
                paddingTop: 'var(--space-4)', 
                marginTop: 'var(--space-2)',
                display: 'flex',
                flexDirection: 'column',
                gap: 'var(--space-3)'
              }}>
                <span style={{ fontSize: '0.8rem', fontWeight: 'var(--weight-extrabold)', color: 'var(--text-primary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Activity History & Audit Trail
                </span>
                
                <div style={{ 
                  display: 'flex', 
                  flexDirection: 'column', 
                  gap: 'var(--space-4)', 
                  backgroundColor: 'var(--input-bg)', 
                  padding: 'var(--space-4)', 
                  borderRadius: 'var(--radius-md)', 
                  border: '1px solid var(--border-primary)'
                }}>
                  {/* Registered By */}
                  <div style={{ display: 'flex', flexDirection: 'column', borderBottom: '1px solid var(--border-secondary)', paddingBottom: 'var(--space-2)' }}>
                    <div style={{ fontSize: '0.725rem', color: 'var(--text-muted)', fontWeight: 'bold', textTransform: 'uppercase' }}>Registered By</div>
                    {getAuditInfo(viewingVisitor?.registeredBy, viewingVisitor?.registeredAt || viewingVisitor?.createdAt)}
                  </div>

                  {/* Approved / Rejected By */}
                  <div style={{ display: 'flex', flexDirection: 'column', borderBottom: '1px solid var(--border-secondary)', paddingBottom: 'var(--space-2)' }}>
                    <div style={{ fontSize: '0.725rem', color: viewingVisitor?.status === 'rejected' ? 'var(--color-danger)' : 'var(--color-success)', fontWeight: 'bold', textTransform: 'uppercase' }}>
                      {viewingVisitor?.status === 'rejected' ? 'Rejected By' : 'Approved By'}
                    </div>
                    {viewingVisitor?.status === 'rejected'
                      ? getAuditInfo(viewingVisitor?.rejectedBy, viewingVisitor?.rejectedAt)
                      : getAuditInfo(viewingVisitor?.approvedBy, viewingVisitor?.approvedAt)
                    }
                  </div>

                  {/* Checked In By */}
                  <div style={{ display: 'flex', flexDirection: 'column', borderBottom: '1px solid var(--border-secondary)', paddingBottom: 'var(--space-2)' }}>
                    <div style={{ fontSize: '0.725rem', color: 'var(--primary)', fontWeight: 'bold', textTransform: 'uppercase' }}>Checked In By</div>
                    {getAuditInfo(viewingVisitor?.checkedInBy, viewingVisitor?.checkedInAt || viewingVisitor?.checkInTime)}
                  </div>

                  {/* Checked Out By */}
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <div style={{ fontSize: '0.725rem', color: 'var(--color-success)', fontWeight: 'bold', textTransform: 'uppercase' }}>Checked Out By</div>
                    {getAuditInfo(viewingVisitor?.checkedOutBy, viewingVisitor?.checkedOutAt || viewingVisitor?.checkOutTime)}
                  </div>
                </div>
              </div>

            </div>
            <div className="modal-footer" style={{ borderTop: '1px solid var(--border-primary)', padding: 'var(--space-4) var(--space-5)', display: 'flex', justifyContent: 'flex-end', backgroundColor: 'var(--bg-app)' }}>
              <button className="btn btn-primary" onClick={() => setViewingVisitor(null)}>
                Close Profile
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

export default VisitorList;
