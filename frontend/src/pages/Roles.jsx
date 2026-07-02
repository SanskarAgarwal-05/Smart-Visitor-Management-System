import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/api';

const Roles = () => {
  const [users, setUsers] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Modals & Action States
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [changingPasswordUser, setChangingPasswordUser] = useState(null);

  // Forms
  const [newUser, setNewUser] = useState({
    fullName: '',
    email: '',
    password: '',
    role: 'receptionist',
    status: 'active',
  });

  const [editUser, setEditUser] = useState({
    fullName: '',
    email: '',
    role: 'receptionist',
    status: 'active',
  });

  const [passwordForm, setPasswordForm] = useState({
    password: '',
    confirmPassword: '',
  });

  const navigate = useNavigate();

  // Permissions presets Matrix (UI Guide)
  const rolePermissions = {
    admin: { view: true, edit: true, approve: true, delete: true },
    receptionist: { view: true, edit: true, approve: true, delete: false },
    security: { view: true, edit: false, approve: true, delete: false },
  };

  const fetchData = async () => {
    try {
      setLoading(true);
      setError('');
      
      // 1. Fetch current user profile to verify role
      const meResponse = await api.get('/admin/me');
      setCurrentUser(meResponse.data?.admin || null);

      if (meResponse.data?.admin?.role === 'admin') {
        // 2. Fetch all system users (if Admin)
        const usersResponse = await api.get('/admin/users');
        setUsers(usersResponse.data?.users || []);
      }
    } catch (err) {
      console.error(err);
      if (err.response?.status === 401) {
        localStorage.removeItem('adminToken');
        navigate('/login');
      } else {
        setError(err.response?.data?.message || 'Failed to retrieve directory data.');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [navigate]);

  // Handle Create User
  const handleAddUser = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!newUser.fullName || !newUser.email || !newUser.password) {
      setError('Please provide full name, email, and password.');
      return;
    }

    if (newUser.password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }

    try {
      setLoading(true);
      await api.post('/admin/users', newUser);
      setSuccess('User account created successfully!');
      setNewUser({ fullName: '', email: '', password: '', role: 'receptionist', status: 'active' });
      setShowAddForm(false);
      
      // Refresh user list
      const usersResponse = await api.get('/admin/users');
      setUsers(usersResponse.data?.users || []);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create user account.');
    } finally {
      setLoading(false);
    }
  };

  // Handle Edit User (Open Modal)
  const openEditModal = (user) => {
    setEditingUser(user);
    setEditUser({
      fullName: user.fullName || '',
      email: user.email || '',
      role: user.role || 'receptionist',
      status: user.status || 'active',
    });
  };

  // Handle Update User Details
  const handleUpdateUser = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    try {
      setLoading(true);
      await api.put(`/admin/users/${editingUser._id}`, editUser);
      setSuccess('User details updated successfully!');
      setEditingUser(null);

      // Refresh user list
      const usersResponse = await api.get('/admin/users');
      setUsers(usersResponse.data?.users || []);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update user account details.');
    } finally {
      setLoading(false);
    }
  };

  // Handle Reset User Password
  const handleUpdatePassword = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (passwordForm.password !== passwordForm.confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    if (passwordForm.password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }

    try {
      setLoading(true);
      await api.put(`/admin/users/${changingPasswordUser._id}/password`, passwordForm);
      setSuccess(`Password for ${changingPasswordUser.fullName || changingPasswordUser.email} has been updated.`);
      setChangingPasswordUser(null);
      setPasswordForm({ password: '', confirmPassword: '' });
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update user password.');
    } finally {
      setLoading(false);
    }
  };

  // Handle Delete User
  const handleDeleteUser = async (id, name) => {
    if (id === currentUser?._id) {
      alert('You cannot delete your own logged-in admin account.');
      return;
    }

    if (!window.confirm(`Are you sure you want to permanently delete user account "${name}"?`)) {
      return;
    }

    try {
      setLoading(true);
      setError('');
      await api.delete(`/admin/users/${id}`);
      setSuccess('User account removed successfully.');
      setUsers((prev) => prev.filter((u) => u._id !== id));
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to delete user account.');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    const d = new Date(dateStr);
    return isNaN(d.getTime()) ? '-' : d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
  };

  // Render Access Denied for non-admin accounts (Receptionist and Security)
  if (currentUser && currentUser.role !== 'admin') {
    return (
      <div style={{ animation: 'fadeIn var(--transition-normal) ease-out', maxWidth: '600px', margin: 'var(--space-12) auto', textAlign: 'center' }}>
        <div className="card" style={{ padding: 'var(--space-8)' }}>
          <div style={{ fontSize: '3rem', marginBottom: 'var(--space-4)' }}>⚠️</div>
          <h2 style={{ fontSize: '1.4rem', fontWeight: 'var(--weight-extrabold)', color: 'var(--text-primary)', marginBottom: 'var(--space-2)' }}>
            Clearance Required
          </h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', lineHeight: '1.6', marginBottom: 'var(--space-6)' }}>
            Your account role <strong>({currentUser.role})</strong> is not authorized to access user accounts, update security passwords, or manage clearances. Please contact your administrator.
          </p>
          <button className="btn btn-primary" onClick={() => navigate('/dashboard')}>
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ animation: 'fadeIn var(--transition-normal) ease-out' }}>
      <div style={{ marginBottom: 'var(--space-6)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 'var(--space-4)' }}>
        <div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 'var(--weight-extrabold)', color: 'var(--text-primary)' }}>Roles & Permissions</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginTop: '2px' }}>
            Provision administration access, define system roles, and assign security clearances.
          </p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowAddForm(true)}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ marginRight: '6px' }}>
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          Authorize User Account
        </button>
      </div>

      {error && <div className="alert alert-danger">{error}</div>}
      {success && <div className="alert alert-success">{success}</div>}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 'var(--space-6)', alignItems: 'flex-start' }}>
        
        {/* ROLE MATRIX CONFIGURATION (UI Presets Guide) */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
          <div className="card">
            <h3 style={{ fontSize: '1.05rem', fontWeight: 'var(--weight-extrabold)', color: 'var(--text-primary)', marginBottom: 'var(--space-4)' }}>
              Permissions Matrix
            </h3>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
              {Object.keys(rolePermissions).map((role) => (
                <div key={role} style={{ border: '1px solid var(--border-primary)', padding: 'var(--space-4)', borderRadius: 'var(--radius-md)', textAlign: 'left' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-3)', borderBottom: '1px solid var(--border-secondary)', paddingBottom: 'var(--space-15)' }}>
                    <span style={{ fontWeight: 'var(--weight-bold)', textTransform: 'uppercase', color: 'var(--primary)', fontSize: '0.8rem', letterSpacing: '0.05em' }}>
                      {role}
                    </span>
                    <span style={{ fontSize: '0.725rem', color: 'var(--text-muted)' }}>Role Preset</span>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.8rem' }}>
                      <span style={{ color: 'var(--text-secondary)' }}>View Visitors</span>
                      <span style={{ color: rolePermissions[role].view ? 'var(--color-success)' : 'var(--text-muted)' }}>{rolePermissions[role].view ? '● Granted' : '○ Denied'}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.8rem' }}>
                      <span style={{ color: 'var(--text-secondary)' }}>Edit Visitor Info</span>
                      <span style={{ color: rolePermissions[role].edit ? 'var(--color-success)' : 'var(--text-muted)' }}>{rolePermissions[role].edit ? '● Granted' : '○ Denied'}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.8rem' }}>
                      <span style={{ color: 'var(--text-secondary)' }}>Approve Entry request</span>
                      <span style={{ color: rolePermissions[role].approve ? 'var(--color-success)' : 'var(--text-muted)' }}>{rolePermissions[role].approve ? '● Granted' : '○ Denied'}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.8rem' }}>
                      <span style={{ color: 'var(--text-secondary)' }}>Delete Log Records</span>
                      <span style={{ color: rolePermissions[role].delete ? 'var(--color-success)' : 'var(--text-muted)' }}>{rolePermissions[role].delete ? '● Granted' : '○ Denied'}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* STAFF DIRECTORY TABLE */}
        <div className="card" style={{ padding: 0 }}>
          <div style={{ padding: 'var(--space-5)', borderBottom: '1px solid var(--border-secondary)' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 'var(--weight-extrabold)', color: 'var(--text-primary)' }}>System Users Directory</h3>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '2px' }}>Registered administrators, receptionists, and security personnel.</p>
          </div>

          {loading && users.length === 0 ? (
            <div style={{ padding: 'var(--space-8)', textAlign: 'center', color: 'var(--text-muted)' }}>Loading system directory...</div>
          ) : (
            <div className="table-wrapper" style={{ border: 'none', borderRadius: 0 }}>
              <table className="table">
                <thead>
                  <tr>
                    <th>Full Name</th>
                    <th>Email Address</th>
                    <th>Role</th>
                    <th>Account Status</th>
                    <th>Created Date</th>
                    <th style={{ textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((u) => (
                    <tr key={u._id}>
                      <td>
                        <div style={{ fontWeight: 'var(--weight-semibold)', color: 'var(--text-primary)' }}>{u.fullName || <span style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>Not Specified</span>}</div>
                        {u.lastUpdatedBy && (
                          <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                            Updated by: {u.lastUpdatedBy}
                          </div>
                        )}
                      </td>
                      <td style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{u.email}</td>
                      <td>
                        <span className={`badge ${u.role === 'admin' ? 'badge-pending' : u.role === 'receptionist' ? 'badge-approved' : 'badge-checked-out'}`} style={{ fontSize: '0.7rem' }}>
                          {u.role}
                        </span>
                      </td>
                      <td>
                        <span className={`badge ${u.status === 'active' ? 'badge-approved' : 'badge-rejected'}`} style={{ fontSize: '0.7rem' }}>
                          {u.status}
                        </span>
                      </td>
                      <td style={{ fontSize: '0.825rem', color: 'var(--text-muted)' }}>
                        {formatDate(u.createdAt)}
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: 'var(--space-2)', justifyContent: 'flex-end', alignItems: 'center' }}>
                          <button
                            onClick={() => openEditModal(u)}
                            className="btn btn-outline btn-sm"
                            style={{ borderColor: 'var(--primary)', color: 'var(--primary)' }}
                            title="Edit User Info"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => setChangingPasswordUser(u)}
                            className="btn btn-outline btn-sm"
                            title="Change Password"
                          >
                            Password
                          </button>
                          <button
                            onClick={() => handleDeleteUser(u._id, u.fullName || u.email)}
                            className="btn btn-danger btn-sm"
                            disabled={u._id === currentUser?._id}
                            title={u._id === currentUser?._id ? 'Self-deletion blocked' : 'Delete Account'}
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* CREATE STAFF ACCOUNT MODAL */}
      {showAddForm && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <span className="modal-title">Authorize Staff Profile</span>
              <button className="modal-close" onClick={() => setShowAddForm(false)}>×</button>
            </div>
            <div className="modal-body">
              <form onSubmit={handleAddUser} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
                <div className="form-group">
                  <label className="form-label">Full Name</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="e.g. John Doe"
                    value={newUser.fullName}
                    onChange={(e) => setNewUser(prev => ({ ...prev, fullName: e.target.value }))}
                    required
                  />
                </div>
                
                <div className="form-group">
                  <label className="form-label">Email Address</label>
                  <input
                    type="email"
                    className="form-control"
                    placeholder="e.g. john@company.com"
                    value={newUser.email}
                    onChange={(e) => setNewUser(prev => ({ ...prev, email: e.target.value }))}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Initial Password</label>
                  <input
                    type="password"
                    className="form-control"
                    placeholder="••••••••"
                    value={newUser.password}
                    onChange={(e) => setNewUser(prev => ({ ...prev, password: e.target.value }))}
                    required
                  />
                </div>

                <div className="form-grid">
                  <div className="form-group">
                    <label className="form-label">Access Level / Role</label>
                    <select
                      className="form-control"
                      value={newUser.role}
                      onChange={(e) => setNewUser(prev => ({ ...prev, role: e.target.value }))}
                    >
                      <option value="admin">Administrator</option>
                      <option value="receptionist">Receptionist</option>
                      <option value="security">Security Guard</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Status</label>
                    <select
                      className="form-control"
                      value={newUser.status}
                      onChange={(e) => setNewUser(prev => ({ ...prev, status: e.target.value }))}
                    >
                      <option value="active">Active</option>
                      <option value="inactive">Inactive</option>
                    </select>
                  </div>
                </div>

                <div className="form-actions">
                  <button type="button" onClick={() => setShowAddForm(false)} className="btn btn-outline">
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-primary">
                    Create Profile
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* EDIT USER DETAILS MODAL */}
      {editingUser && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <span className="modal-title">Edit Account: {editingUser.email}</span>
              <button className="modal-close" onClick={() => setEditingUser(null)}>×</button>
            </div>
            <div className="modal-body">
              <form onSubmit={handleUpdateUser} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
                <div className="form-group">
                  <label className="form-label">Full Name</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="e.g. John Doe"
                    value={editUser.fullName}
                    onChange={(e) => setEditUser(prev => ({ ...prev, fullName: e.target.value }))}
                    required
                  />
                </div>
                
                <div className="form-group">
                  <label className="form-label">Email Address</label>
                  <input
                    type="email"
                    className="form-control"
                    placeholder="e.g. john@company.com"
                    value={editUser.email}
                    onChange={(e) => setEditUser(prev => ({ ...prev, email: e.target.value }))}
                    required
                  />
                </div>

                <div className="form-grid">
                  <div className="form-group">
                    <label className="form-label">Access Level / Role</label>
                    <select
                      className="form-control"
                      value={editUser.role}
                      onChange={(e) => setEditUser(prev => ({ ...prev, role: e.target.value }))}
                    >
                      <option value="admin">Administrator</option>
                      <option value="receptionist">Receptionist</option>
                      <option value="security">Security Guard</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Status</label>
                    <select
                      className="form-control"
                      value={editUser.status}
                      onChange={(e) => setEditUser(prev => ({ ...prev, status: e.target.value }))}
                    >
                      <option value="active">Active</option>
                      <option value="inactive">Inactive</option>
                    </select>
                  </div>
                </div>

                <div className="form-actions">
                  <button type="button" onClick={() => setEditingUser(null)} className="btn btn-outline">
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-primary">
                    Save Changes
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* CHANGE PASSWORD SECURE MODAL */}
      {changingPasswordUser && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <span className="modal-title">Change Password for {changingPasswordUser.fullName || changingPasswordUser.email}</span>
              <button className="modal-close" onClick={() => setChangingPasswordUser(null)}>×</button>
            </div>
            <div className="modal-body">
              <form onSubmit={handleUpdatePassword} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
                <div className="form-group">
                  <label className="form-label">New Password</label>
                  <input
                    type="password"
                    className="form-control"
                    placeholder="••••••••"
                    value={passwordForm.password}
                    onChange={(e) => setPasswordForm(prev => ({ ...prev, password: e.target.value }))}
                    required
                    minLength={6}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Confirm Password</label>
                  <input
                    type="password"
                    className="form-control"
                    placeholder="••••••••"
                    value={passwordForm.confirmPassword}
                    onChange={(e) => setPasswordForm(prev => ({ ...prev, confirmPassword: e.target.value }))}
                    required
                    minLength={6}
                  />
                </div>

                <div className="form-actions">
                  <button type="button" onClick={() => { setChangingPasswordUser(null); setPasswordForm({ password: '', confirmPassword: '' }); }} className="btn btn-outline">
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-primary">
                    Update Password
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Roles;
