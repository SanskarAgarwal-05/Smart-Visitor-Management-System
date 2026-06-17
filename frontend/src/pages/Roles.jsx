import React, { useState } from 'react';

const Roles = () => {
  // Preset Roles & Permissions mapping
  const [rolePermissions, setRolePermissions] = useState({
    admin: { view: true, edit: true, approve: true, delete: true },
    receptionist: { view: true, edit: true, approve: true, delete: false },
    security: { view: true, edit: false, approve: true, delete: false },
  });

  // Active staff list (mocked locally for full UI functionality without breaking API/backend schemas)
  const [staff, setStaff] = useState([
    { id: 1, name: 'Sanskar Mehta', email: 'sanskar@company.com', role: 'admin', status: 'Active' },
    { id: 2, name: 'Emily Rose', email: 'emily@company.com', role: 'receptionist', status: 'Active' },
    { id: 3, name: 'Marcus Vance', email: 'marcus@company.com', role: 'security', status: 'Active' },
  ]);

  const [newStaff, setNewStaff] = useState({ name: '', email: '', role: 'receptionist' });
  const [showAddForm, setShowAddForm] = useState(false);
  const [error, setError] = useState('');

  const handleTogglePermission = (role, perm) => {
    setRolePermissions(prev => ({
      ...prev,
      [role]: {
        ...prev[role],
        [perm]: !prev[role][perm]
      }
    }));
  };

  const handleAddStaff = (e) => {
    e.preventDefault();
    setError('');
    
    if (!newStaff.name || !newStaff.email) {
      setError('Please fill in both name and email address.');
      return;
    }

    const emailExists = staff.some(s => s.email.toLowerCase() === newStaff.email.toLowerCase());
    if (emailExists) {
      setError('A staff profile with this email address already exists.');
      return;
    }

    const created = {
      id: staff.length + 1,
      name: newStaff.name,
      email: newStaff.email.toLowerCase(),
      role: newStaff.role,
      status: 'Active'
    };

    setStaff(prev => [...prev, created]);
    setNewStaff({ name: '', email: '', role: 'receptionist' });
    setShowAddForm(false);
  };

  const handleRemoveStaff = (id) => {
    if (window.confirm('Are you sure you want to remove this staff profile?')) {
      setStaff(prev => prev.filter(s => s.id !== id));
    }
  };

  return (
    <div style={{ animation: 'fadeIn var(--transition-normal) ease-out' }}>
      <div style={{ marginBottom: 'var(--space-6)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 'var(--space-4)' }}>
        <div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 'var(--weight-extrabold)', color: 'var(--text-primary)' }}>Roles & Permissions</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginTop: '2px' }}>
            Provision administration access, define system roles, and assign security clearance.
          </p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowAddForm(true)}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <line x1="12" y1="5" x2="12" y2="19" strokeLinecap="round" />
            <line x1="5" y1="12" x2="19" y2="12" strokeLinecap="round" />
          </svg>
          Add Staff Member
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1.8fr', gap: 'var(--space-6)', alignItems: 'flex-start' }}>
        
        {/* ROLE MATRIX CONFIGURATION */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
          <div className="card">
            <h3 style={{ fontSize: '1.1rem', fontWeight: 'var(--weight-extrabold)', color: 'var(--text-primary)', marginBottom: 'var(--space-4)' }}>
              Permissions Matrix
            </h3>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
              {Object.keys(rolePermissions).map((role) => (
                <div key={role} style={{ border: '1px solid var(--border-primary)', padding: 'var(--space-4)', borderRadius: 'var(--radius-md)', textAlign: 'left' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-3)', borderBottom: '1px solid var(--border-secondary)', paddingBottom: 'var(--space-15)' }}>
                    <span style={{ fontWeight: 'var(--weight-bold)', textTransform: 'capitalize', color: 'var(--primary)', fontSize: '0.925rem' }}>
                      {role}
                    </span>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Role Presets</span>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {/* View visitors */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.825rem' }}>
                      <span>View Visitors</span>
                      <input 
                        type="checkbox" 
                        checked={rolePermissions[role].view} 
                        onChange={() => handleTogglePermission(role, 'view')}
                        style={{ width: '16px', height: '16px', cursor: 'pointer' }}
                      />
                    </div>
                    {/* Edit visitors */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.825rem' }}>
                      <span>Edit Visitor Info</span>
                      <input 
                        type="checkbox" 
                        checked={rolePermissions[role].edit} 
                        onChange={() => handleTogglePermission(role, 'edit')}
                        style={{ width: '16px', height: '16px', cursor: 'pointer' }}
                      />
                    </div>
                    {/* Approve visitors */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.825rem' }}>
                      <span>Approve Entry request</span>
                      <input 
                        type="checkbox" 
                        checked={rolePermissions[role].approve} 
                        onChange={() => handleTogglePermission(role, 'approve')}
                        style={{ width: '16px', height: '16px', cursor: 'pointer' }}
                      />
                    </div>
                    {/* Delete visitors */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.825rem' }}>
                      <span>Delete Log Records</span>
                      <input 
                        type="checkbox" 
                        checked={rolePermissions[role].delete} 
                        onChange={() => handleTogglePermission(role, 'delete')}
                        style={{ width: '16px', height: '16px', cursor: 'pointer' }}
                      />
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
            <h3 style={{ fontSize: '1.1rem', fontWeight: 'var(--weight-extrabold)', color: 'var(--text-primary)' }}>Active Staff Accounts</h3>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '2px' }}>Users authorized to access the visitor log modules.</p>
          </div>

          <div className="table-wrapper" style={{ border: 'none', borderRadius: 0 }}>
            <table className="table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Assigned Role</th>
                  <th>Status</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {staff.map((s) => (
                  <tr key={s.id}>
                    <td>
                      <div style={{ fontWeight: 'var(--weight-semibold)', color: 'var(--text-primary)' }}>{s.name}</div>
                    </td>
                    <td style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{s.email}</td>
                    <td>
                      <span className="badge badge-approved" style={{ fontSize: '0.7rem' }}>
                        {s.role}
                      </span>
                    </td>
                    <td>
                      <span className="badge badge-checked-out" style={{ fontSize: '0.7rem' }}>
                        {s.status}
                      </span>
                    </td>
                    <td>
                      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                        <button
                          onClick={() => handleRemoveStaff(s.id)}
                          className="btn btn-danger btn-sm"
                          disabled={s.id === 1} // Can't remove primary admin
                        >
                          Revoke
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* ADD STAFF MODAL */}
      {showAddForm && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <span className="modal-title">Authorize Staff Profile</span>
              <button className="modal-close" onClick={() => setShowAddForm(false)}>×</button>
            </div>
            <div className="modal-body">
              {error && <div className="alert alert-danger">{error}</div>}
              <form onSubmit={handleAddStaff} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
                <div className="form-group">
                  <label className="form-label">Full Name</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="e.g. John Doe"
                    value={newStaff.name}
                    onChange={(e) => setNewStaff(prev => ({ ...prev, name: e.target.value }))}
                    required
                  />
                </div>
                
                <div className="form-group">
                  <label className="form-label">Email Address</label>
                  <input
                    type="email"
                    className="form-control"
                    placeholder="e.g. john@company.com"
                    value={newStaff.email}
                    onChange={(e) => setNewStaff(prev => ({ ...prev, email: e.target.value }))}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Access Level / Role</label>
                  <select
                    className="form-control"
                    value={newStaff.role}
                    onChange={(e) => setNewStaff(prev => ({ ...prev, role: e.target.value }))}
                  >
                    <option value="admin">Administrator</option>
                    <option value="receptionist">Receptionist</option>
                    <option value="security">Security Guard</option>
                  </select>
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
    </div>
  );
};

export default Roles;
