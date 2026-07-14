import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/api';
import VisitorForm from '../components/VisitorForm';

const formatDateForPopup = (dateStr) => {
  if (!dateStr) return 'N/A';
  const date = new Date(dateStr);
  const day = String(date.getDate()).padStart(2, '0');
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const month = months[date.getMonth()];
  const year = date.getFullYear();
  let hours = date.getHours();
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const ampm = hours >= 12 ? 'AM' : 'PM';
  hours = hours % 12;
  hours = hours ? hours : 12;
  const strTime = String(hours).padStart(2, '0') + ':' + minutes + ' ' + ampm;
  return `${day} ${month} ${year} ${strTime}`;
};

const getAlertDetails = (alertMsg, visitor) => {
  if (alertMsg.includes('associated with multiple visitor identities') || alertMsg.includes('Duplicate Phone')) {
    const lines = alertMsg.split('\n');
    const names = lines
      .filter(line => line.trim().startsWith('*') || line.trim().startsWith('-'))
      .map(line => line.replace(/^[\s*-]+/, '').trim());

    return {
      type: 'Duplicate Phone Number Detected',
      phone: visitor.phoneNumber,
      associated: names.length > 0 ? names : [],
      reason: 'This phone number is being used by multiple visitor identities.',
      severity: 'High',
      action: 'Verify visitor identity before approval.',
      timestamp: visitor.suspiciousAlertTimestamp || visitor.updatedAt || visitor.createdAt
    };
  } else if (alertMsg.includes('Multiple Rejections')) {
    return {
      type: 'Multiple Rejections',
      phone: visitor.phoneNumber,
      associated: [],
      reason: 'This phone number has been rejected 3 or more times within 24 hours.',
      severity: 'High',
      action: 'Investigate reason for past rejections before granting access.',
      timestamp: visitor.updatedAt || visitor.createdAt
    };
  } else if (alertMsg.includes('Multiple Visits')) {
    return {
      type: 'Multiple Visits',
      phone: visitor.phoneNumber,
      associated: [],
      reason: 'This visitor registered more than 5 times in 24 hours.',
      severity: 'Medium',
      action: 'Verify reason for frequent entry requests.',
      timestamp: visitor.updatedAt || visitor.createdAt
    };
  } else if (alertMsg.includes('Out of Hours')) {
    return {
      type: 'Out of Hours Registration',
      phone: visitor.phoneNumber,
      associated: [],
      reason: alertMsg,
      severity: 'Low',
      action: 'Ensure after-hours registration is authorized by hosts.',
      timestamp: visitor.updatedAt || visitor.createdAt
    };
  } else {
    return {
      type: 'Suspicious Activity Flagged',
      phone: visitor.phoneNumber,
      associated: [],
      reason: alertMsg,
      severity: 'Medium',
      action: 'Check visitor logs and verify credentials.',
      timestamp: visitor.updatedAt || visitor.createdAt
    };
  }
};

const VisitorList = () => {
  const [visitors, setVisitors] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [localSearch, setLocalSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [visitorTimeLimit, setVisitorTimeLimit] = useState(4);
  const [isEditingLimit, setIsEditingLimit] = useState(false);
  const [tempLimit, setTempLimit] = useState(4);
  
  // Modals state
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingVisitor, setEditingVisitor] = useState(null);
  const [viewingVisitor, setViewingVisitor] = useState(null);
  const [suspiciousPopupVisitor, setSuspiciousPopupVisitor] = useState(null);

  const [showExportDropdown, setShowExportDropdown] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const exportDropdownRef = useRef(null);

  const navigate = useNavigate();

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (exportDropdownRef.current && !exportDropdownRef.current.contains(event.target)) {
        setShowExportDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleExport = async (type) => {
    try {
      setIsExporting(true);
      setShowExportDropdown(false);

      let endpoint = '';
      if (type === 'today') {
        endpoint = '/admin/reports/daily';
      } else if (type === 'weekly') {
        endpoint = '/admin/reports/weekly';
      } else if (type === 'historical') {
        endpoint = '/admin/reports/historical';
      } else {
        throw new Error('Invalid report type');
      }

      const response = await api.get(endpoint, {
        responseType: 'blob'
      });
      
      const contentDisposition = response.headers['content-disposition'];
      let filename = '';
      if (contentDisposition) {
        const matches = /filename="([^"]+)"/.exec(contentDisposition);
        if (matches && matches[1]) {
          filename = matches[1];
        }
      }
      
      if (!filename) {
        const now = new Date();
        const yyyy = now.getFullYear();
        const mm = String(now.getMonth() + 1).padStart(2, '0');
        const dd = String(now.getDate()).padStart(2, '0');
        if (type === 'today') {
          filename = `daily_report_${yyyy}_${mm}_${dd}.csv`;
        } else if (type === 'weekly') {
          filename = `weekly_report_${yyyy}_${mm}_${dd}.csv`;
        } else {
          filename = `historical_logs_${yyyy}_${mm}_${dd}.csv`;
        }
      }

      const blob = new Blob([response.data], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Failed to export CSV report', err);
      let errorMsg = 'Failed to generate report. Please try again.';
      if (err.response?.data instanceof Blob) {
        try {
          const text = await err.response.data.text();
          const json = JSON.parse(text);
          errorMsg = json.message || errorMsg;
        } catch (e) {
          // not json
        }
      } else if (err.response?.data?.message) {
        errorMsg = err.response.data.message;
      }
      let detail = '';
      if (err.response) {
        detail = ` (Status: ${err.response.status}, Message: ${errorMsg})`;
      } else if (err.message) {
        detail = ` (${err.message})`;
      }
      alert(`Failed to generate report. Please try again.${detail}`);
    } finally {
      setIsExporting(false);
    }
  };

  const handleDismissAlert = async (visitorId, alertText) => {
    try {
      await api.put(`/visitor/${visitorId}/dismiss-alert`, { alertText });
      fetchVisitors();
      setSuspiciousPopupVisitor(null);
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.message || 'Failed to dismiss alert.');
    }
  };

  const fetchVisitors = async () => {
    try {
      setLoading(true);
      setError('');
      const response = await api.get('/visitor');
      setVisitors(response.data.visitors || []);
      setVisitorTimeLimit(response.data.visitorTimeLimit || 4);
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

  const handleSaveLimit = async () => {
    try {
      const response = await api.put('/admin/settings', { visitorTimeLimit: Number(tempLimit) });
      if (response.data?.success) {
        setVisitorTimeLimit(response.data.visitorTimeLimit || Number(tempLimit));
        setIsEditingLimit(false);
        fetchVisitors();
      }
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.message || 'Failed to update time limit.');
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
        <div style={{ display: 'flex', gap: 'var(--space-3)', alignItems: 'center' }}>
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: '8px', 
            backgroundColor: 'var(--bg-card)', 
            padding: 'var(--space-2) var(--space-4)', 
            borderRadius: 'var(--radius-md)', 
            border: '1px solid var(--border-primary)',
            fontSize: '0.875rem',
            fontWeight: 'var(--weight-bold)',
            color: 'var(--text-primary)',
            height: 'fit-content'
          }}>
            <span style={{ color: 'var(--primary)' }}>🕒</span>
            {isEditingLimit ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span>Limit: </span>
                <input
                  type="number"
                  min="1"
                  max="24"
                  value={tempLimit}
                  onChange={(e) => setTempLimit(e.target.value)}
                  style={{ width: '60px', padding: '2px 4px', borderRadius: '4px', border: '1px solid var(--border-primary)', backgroundColor: 'var(--input-bg)', color: 'var(--text-primary)' }}
                />
                <span>Hrs</span>
                <button 
                  onClick={handleSaveLimit}
                  className="btn btn-primary btn-sm"
                  style={{ padding: '2px 8px', fontSize: '0.75rem', minWidth: 'unset' }}
                >
                  Save
                </button>
                <button 
                  onClick={() => setIsEditingLimit(false)}
                  className="btn btn-outline btn-sm"
                  style={{ padding: '2px 8px', fontSize: '0.75rem', minWidth: 'unset' }}
                >
                  Cancel
                </button>
              </div>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span>Visitor Time Limit: {visitorTimeLimit} Hours</span>
                {currentUser?.role === 'admin' && (
                  <button
                    onClick={() => {
                      setTempLimit(visitorTimeLimit);
                      setIsEditingLimit(true);
                    }}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: 'var(--primary)',
                      cursor: 'pointer',
                      fontSize: '0.8rem',
                      fontWeight: 'bold',
                      textDecoration: 'underline',
                      padding: 0
                    }}
                  >
                    [Edit]
                  </button>
                )}
              </div>
            )}
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
      </div>

      {error && <div className="alert alert-danger">{error}</div>}

      {/* Overstay Alerts Banner */}
      {visitors.filter(v => v.isOverstayed).map(v => (
        <div 
          key={v._id}
          className="alert alert-danger" 
          style={{ 
            marginBottom: 'var(--space-4)', 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'space-between',
            borderLeft: '4px solid var(--color-danger)',
            backgroundColor: 'rgba(239, 68, 68, 0.1)',
            color: 'var(--color-danger)',
            padding: 'var(--space-3) var(--space-4)',
            borderRadius: 'var(--radius-md)',
            fontWeight: 'var(--weight-semibold)'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span>⚠️</span>
            <span>Visitor <strong>{v.fullName}</strong> has overstayed by {v.overstayDuration}.</span>
          </div>
          {canVerify && (
            <button 
              className="btn btn-danger btn-sm"
              onClick={() => handleStatusUpdate(v._id, 'checked-out')}
              style={{ padding: '4px 12px', fontSize: '0.75rem' }}
            >
              Check Out
            </button>
          )}
        </div>
      ))}

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

        {currentUser?.role === 'admin' && (
          <div style={{ 
            flex: '0 0 auto', 
            position: 'relative', 
            alignSelf: 'flex-end', 
            marginTop: 'auto',
            marginLeft: 'auto'
          }} ref={exportDropdownRef}>
            <label className="form-label" style={{ fontSize: '0.75rem', visibility: 'hidden', display: 'block' }}>Export</label>
            <button 
              className="btn btn-outline" 
              onClick={() => setShowExportDropdown(!showExportDropdown)}
              disabled={isExporting}
              style={{ display: 'flex', alignItems: 'center', gap: '8px', height: '42px', cursor: 'pointer' }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="7 10 12 15 17 10" />
                <line x1="12" y1="15" x2="12" y2="3" />
              </svg>
              {isExporting ? 'Exporting...' : 'Export Reports ▼'}
            </button>
            {showExportDropdown && (
              <div className="dropdown-menu" style={{ right: 0, top: 'calc(100% + 4px)', minWidth: '180px' }}>
                <div className="dropdown-item" onClick={() => handleExport('today')}>
                  <span>📅</span> Today's Report
                </div>
                <div className="dropdown-item" onClick={() => handleExport('weekly')}>
                  <span>📅</span> Weekly Report
                </div>
                <div className="dropdown-item" onClick={() => handleExport('historical')}>
                  <span>📊</span> Historical Logs
                </div>
              </div>
            )}
          </div>
        )}
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
                  <tr 
                    key={v._id || v.visitorId}
                    style={{
                      backgroundColor: v.isOverstayed ? 'rgba(239, 68, 68, 0.05)' : 'transparent',
                      borderLeft: v.isOverstayed ? '4px solid var(--color-danger)' : 'none',
                    }}
                  >
                    <td style={{ fontWeight: 'var(--weight-bold)', color: 'var(--primary)' }}>{v.visitorId}</td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <div style={{ fontWeight: 'var(--weight-semibold)' }}>{v.fullName}</div>
                        {currentUser?.role === 'admin' && v.isSuspicious && (
                          <span 
                            title={`Suspicious Activity Detected:\n${v.suspiciousAlerts.join('\n')}`} 
                            style={{ 
                              color: 'var(--accent-orange)', 
                              fontSize: '1rem', 
                              cursor: 'help' 
                            }}
                          >
                            ⚠️
                          </span>
                        )}
                      </div>
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        {canVerify ? (
                          <select
                            value={v.status}
                            onChange={(e) => handleStatusUpdate(v._id || v.visitorId, e.target.value)}
                            className={`status-select ${v.isOverstayed ? 'status-select-overstayed' : `status-select-${v.status}`}`}
                            style={v.isOverstayed ? { backgroundColor: 'var(--color-danger)', color: '#fff', borderColor: 'var(--color-danger)' } : {}}
                          >
                            <option value="pending">Pending</option>
                            <option value="approved">{v.isOverstayed ? 'OVERSTAYED' : 'Approved'}</option>
                            <option value="rejected">Rejected</option>
                            <option value="checked-out">Checked-Out</option>
                          </select>
                        ) : (
                          <span 
                            className={`badge ${v.isOverstayed ? 'badge-danger' : `badge-${v.status}`}`}
                            style={v.isOverstayed ? { backgroundColor: 'var(--color-danger)', color: '#fff' } : {}}
                          >
                            {v.isOverstayed ? 'OVERSTAYED' : v.status}
                          </span>
                        )}
                        {currentUser?.role === 'admin' && v.isSuspicious && (
                          <span 
                            className="badge badge-danger" 
                            style={{ 
                              backgroundColor: 'var(--color-danger)', 
                              color: '#fff',
                              display: 'inline-flex',
                              alignItems: 'center',
                              padding: '2px 8px',
                              fontSize: '0.75rem',
                              fontWeight: 'var(--weight-bold)',
                              borderRadius: 'var(--radius-sm)',
                              marginLeft: '8px',
                              cursor: 'pointer'
                            }}
                            title="Click to view suspicious activity details"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSuspiciousPopupVisitor(v);
                            }}
                          >
                            Suspicious
                          </span>
                        )}
                      </div>
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
                    <td style={{ fontSize: '0.825rem', color: 'var(--text-secondary)' }}>
                      <span>Checked in at {formatTimeOnly(v.checkInTime || v.checkedInAt || v.createdAt)}</span>
                      {v.overstayDuration && v.overstayDuration !== '0 Minutes' && (
                        <span style={{ color: 'var(--color-danger)', fontWeight: 'bold' }}>
                          {" • "}Overstayed by {v.overstayDuration}
                        </span>
                      )}
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
              {currentUser?.role === 'admin' && viewingVisitor.suspiciousAlertsDetail && viewingVisitor.suspiciousAlertsDetail.filter(a => a.status !== 'resolved').length > 0 && (
                <div style={{ 
                  backgroundColor: 'rgba(245, 158, 11, 0.05)', 
                  border: '1px solid var(--accent-orange)',
                  borderLeft: '4px solid var(--accent-orange)',
                  padding: 'var(--space-4)', 
                  borderRadius: 'var(--radius-md)',
                  color: 'var(--text-primary)',
                  fontSize: '0.85rem',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 'var(--space-3)',
                  textAlign: 'left'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', borderBottom: '1px solid var(--accent-orange)', paddingBottom: '6px', fontWeight: 'var(--weight-bold)', color: 'var(--accent-orange)' }}>
                    <span>⚠️ Suspicious Activity History</span>
                  </div>
                  {viewingVisitor.suspiciousAlertsDetail.filter(a => a.status !== 'resolved').map((alertItem, idx) => {
                    const details = getAlertDetails(alertItem.text, viewingVisitor);
                    const isDismissed = alertItem.status === 'dismissed';
                    return (
                      <div key={idx} style={{ 
                        display: 'flex', 
                        flexDirection: 'column', 
                        gap: '6px',
                        padding: 'var(--space-2) 0',
                        borderBottom: idx < viewingVisitor.suspiciousAlertsDetail.filter(a => a.status !== 'resolved').length - 1 ? '1px dashed rgba(245, 158, 11, 0.3)' : 'none'
                      }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ fontWeight: 'var(--weight-bold)', fontSize: '0.9rem', color: isDismissed ? 'var(--text-secondary)' : 'var(--accent-orange)' }}>
                            {details.type} {isDismissed && '[DISMISSED]'}
                          </span>
                          <span style={{ 
                            fontSize: '0.75rem', 
                            padding: '2px 8px', 
                            borderRadius: '10px', 
                            fontWeight: 'bold',
                            backgroundColor: isDismissed ? 'var(--border-secondary)' : (details.severity === 'High' ? 'rgba(239, 68, 68, 0.15)' : 'rgba(245, 158, 11, 0.15)'),
                            color: isDismissed ? 'var(--text-secondary)' : (details.severity === 'High' ? 'var(--color-danger)' : 'var(--accent-orange)')
                          }}>
                            {isDismissed ? 'Dismissed' : `${details.severity} Severity`}
                          </span>
                        </div>
                        
                        <div>
                          <strong>Phone Number:</strong> {details.phone || 'N/A'}
                        </div>

                        {details.associated.length > 0 && (
                          <div style={{ marginTop: '2px' }}>
                            <strong>Associated Visitors:</strong>
                            <ul style={{ margin: '4px 0 0 16px', padding: 0, listStyleType: 'disc', fontSize: '0.8rem' }}>
                              {details.associated.map((name, nIdx) => (
                                <li key={nIdx}>{name}</li>
                              ))}
                            </ul>
                          </div>
                        )}

                        <div style={{ marginTop: '2px' }}>
                          <strong>Reason:</strong> {details.reason}
                        </div>

                        {!isDismissed && (
                          <div style={{ marginTop: '2px' }}>
                            <strong>Recommended Action:</strong> <span style={{ color: 'var(--color-danger)', fontWeight: 'var(--weight-semibold)' }}>{details.action}</span>
                          </div>
                        )}

                        {isDismissed && alertItem.dismissedBy && (
                          <div style={{ 
                            marginTop: '6px', 
                            padding: 'var(--space-3)', 
                            backgroundColor: 'var(--bg-app)', 
                            border: '1px solid var(--border-primary)', 
                            borderRadius: 'var(--radius-sm)',
                            fontSize: '0.8rem',
                            color: 'var(--text-secondary)',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '4px'
                          }}>
                            <div>
                              <strong>Dismissed by:</strong>
                              <div style={{ color: 'var(--text-primary)' }}>{alertItem.dismissedBy.name}</div>
                            </div>
                            <div>
                              <strong>Dismissed At:</strong>
                              <div style={{ color: 'var(--text-primary)' }}>{formatDateForPopup(alertItem.dismissedAt)}</div>
                            </div>
                          </div>
                        )}

                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                          Flagged at: {formatDateForPopup(alertItem.timestamp)}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {viewingVisitor.isOverstayed && (
                <div style={{ 
                  backgroundColor: 'rgba(239, 68, 68, 0.1)', 
                  border: '1px solid var(--color-danger)',
                  borderLeft: '4px solid var(--color-danger)',
                  padding: 'var(--space-3) var(--space-4)', 
                  borderRadius: 'var(--radius-md)',
                  color: 'var(--color-danger)',
                  fontSize: '0.85rem',
                  fontWeight: 'var(--weight-bold)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}>
                  <span>⚠️</span>
                  <span>Visitor has overstayed by {viewingVisitor.overstayDuration}.</span>
                </div>
              )}
              
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
                <div>
                  <span style={{ fontSize: '0.7rem', fontWeight: 'var(--weight-bold)', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.02em' }}>Check In Time</span>
                  <div style={{ fontSize: '0.85rem', color: 'var(--text-primary)', marginTop: '4px', fontWeight: 'var(--weight-medium)' }}>
                    {formatTimeOnly(viewingVisitor.checkInTime)}
                  </div>
                </div>
                <div>
                  <span style={{ fontSize: '0.7rem', fontWeight: 'var(--weight-bold)', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.02em' }}>Visitor Time Limit</span>
                  <div style={{ fontSize: '0.85rem', color: 'var(--text-primary)', marginTop: '4px', fontWeight: 'var(--weight-medium)' }}>
                    {visitorTimeLimit} Hours
                  </div>
                </div>
                <div>
                  <span style={{ fontSize: '0.7rem', fontWeight: 'var(--weight-bold)', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.02em' }}>Current Duration</span>
                  <div style={{ fontSize: '0.85rem', color: 'var(--text-primary)', marginTop: '4px', fontWeight: 'var(--weight-medium)' }}>
                    {viewingVisitor.currentDuration || '-'}
                  </div>
                </div>
                <div>
                  <span style={{ 
                    fontSize: '0.7rem', 
                    fontWeight: 'var(--weight-bold)', 
                    color: viewingVisitor.overstayDuration && viewingVisitor.overstayDuration !== '0 Minutes' ? 'var(--color-danger)' : 'var(--text-muted)', 
                    textTransform: 'uppercase', 
                    letterSpacing: '0.02em' 
                  }}>
                    Overstay Duration
                  </span>
                  <div style={{ 
                    fontSize: '0.85rem', 
                    color: viewingVisitor.overstayDuration && viewingVisitor.overstayDuration !== '0 Minutes' ? 'var(--color-danger)' : 'var(--text-primary)', 
                    marginTop: '4px', 
                    fontWeight: 'var(--weight-medium)' 
                  }}>
                    {viewingVisitor.overstayDuration || '0 Minutes'}
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

      {/* Suspicious Alert Popup Modal */}
      {suspiciousPopupVisitor && (
        <div className="modal-overlay" onClick={() => setSuspiciousPopupVisitor(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '450px' }}>
            <div className="modal-header" style={{ borderBottom: '1px solid var(--border-primary)', padding: 'var(--space-3) var(--space-4)' }}>
              <span className="modal-title" style={{ fontSize: '1.1rem', fontWeight: 'var(--weight-bold)', color: 'var(--accent-orange)' }}>
                ⚠️ Suspicious Activity Details
              </span>
              <button className="modal-close" onClick={() => setSuspiciousPopupVisitor(null)}>×</button>
            </div>
            <div className="modal-body" style={{ padding: 'var(--space-5)', display: 'flex', flexDirection: 'column', gap: 'var(--space-4)', textAlign: 'left', fontSize: '0.9rem' }}>
              <div>
                <strong style={{ display: 'block', marginBottom: '2px' }}>Visitor:</strong>
                <span style={{ color: 'var(--text-secondary)' }}>{suspiciousPopupVisitor.fullName}</span>
              </div>

              {suspiciousPopupVisitor.suspiciousAlerts.map((alertMsg, idx) => {
                const details = getAlertDetails(alertMsg, suspiciousPopupVisitor);
                return (
                  <div key={idx} style={{ 
                    display: 'flex', 
                    flexDirection: 'column', 
                    gap: '12px',
                    paddingTop: idx > 0 ? 'var(--space-4)' : '0',
                    borderTop: idx > 0 ? '1px dashed rgba(245, 158, 11, 0.3)' : 'none'
                  }}>
                    <div>
                      <strong style={{ display: 'block', marginBottom: '2px' }}>Reason:</strong>
                      <span style={{ color: 'var(--text-secondary)' }}>{details.reason}</span>
                    </div>

                    <div>
                      <strong style={{ display: 'block', marginBottom: '2px' }}>Phone Number:</strong>
                      <span style={{ color: 'var(--text-secondary)' }}>{details.phone || 'N/A'}</span>
                    </div>

                    {details.associated.length > 0 && (
                      <div>
                        <strong style={{ display: 'block', marginBottom: '2px' }}>Associated Visitors:</strong>
                        <ul style={{ margin: '4px 0 0 16px', padding: 0, listStyleType: 'disc', color: 'var(--text-secondary)' }}>
                          {details.associated.map((name, nIdx) => (
                            <li key={nIdx}>{name}</li>
                          ))}
                        </ul>
                      </div>
                    )}

                    <div>
                      <strong style={{ display: 'block', marginBottom: '2px' }}>Recommended Action:</strong>
                      <span style={{ color: 'var(--color-danger)', fontWeight: 'var(--weight-semibold)' }}>{details.action}</span>
                    </div>

                    <div>
                      <strong style={{ display: 'block', marginBottom: '2px' }}>Detected At:</strong>
                      <span style={{ color: 'var(--text-secondary)' }}>{formatDateForPopup(details.timestamp)}</span>
                    </div>

                    {currentUser?.role === 'admin' && (
                      <div style={{ display: 'flex', justifyContent: 'flex-start', marginTop: 'var(--space-3)', borderTop: '1px dashed rgba(245, 158, 11, 0.3)', paddingTop: 'var(--space-3)' }}>
                        <button 
                          className="btn btn-danger btn-sm"
                          onClick={() => handleDismissAlert(suspiciousPopupVisitor._id || suspiciousPopupVisitor.visitorId, alertMsg)}
                          style={{ 
                            padding: '6px 14px', 
                            fontSize: '0.775rem', 
                            backgroundColor: 'var(--color-danger)', 
                            color: '#fff', 
                            border: 'none', 
                            borderRadius: 'var(--radius-sm)', 
                            cursor: 'pointer',
                            fontWeight: 'var(--weight-bold)'
                          }}
                        >
                          Dismiss Alert
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}

              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 'var(--space-2)', borderTop: '1px solid var(--border-primary)', paddingTop: 'var(--space-4)' }}>
                <button 
                  className="btn btn-outline" 
                  onClick={() => setSuspiciousPopupVisitor(null)}
                  style={{ padding: '6px 16px', fontSize: '0.875rem' }}
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        @keyframes pulse {
          0% { opacity: 1; }
          50% { opacity: 0.5; }
          100% { opacity: 1; }
        }
      `}</style>
    </div>
  );
};

export default VisitorList;
