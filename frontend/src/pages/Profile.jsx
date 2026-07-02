import React, { useState, useEffect } from 'react';
import api from '../api/api';

const Profile = () => {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  const [previewImage, setPreviewImage] = useState('');
  const [selectedFile, setSelectedFile] = useState(null);

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        setError('Image file is too large. Max size is 2MB.');
        return;
      }
      setSelectedFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreviewImage(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSavePicture = async () => {
    if (!previewImage) return;
    try {
      setLoading(true);
      setError('');
      setMessage('');
      const response = await api.put('/admin/profile', { profilePicture: previewImage });
      if (response.data?.success) {
        setProfile(response.data.admin);
        setPreviewImage('');
        setSelectedFile(null);
        setMessage('Profile picture updated successfully!');
        window.dispatchEvent(new Event('profileUpdated'));
      }
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.message || 'Failed to update profile picture.');
    } finally {
      setLoading(false);
    }
  };

  const handleRemovePicture = async () => {
    if (!window.confirm('Are you sure you want to remove your profile picture?')) return;
    try {
      setLoading(true);
      setError('');
      setMessage('');
      const response = await api.put('/admin/profile', { profilePicture: '' });
      if (response.data?.success) {
        setProfile(response.data.admin);
        setPreviewImage('');
        setSelectedFile(null);
        setMessage('Profile picture removed.');
        window.dispatchEvent(new Event('profileUpdated'));
      }
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.message || 'Failed to remove profile picture.');
    } finally {
      setLoading(false);
    }
  };

  const fetchProfile = async () => {
    try {
      setLoading(true);
      setError('');
      const response = await api.get('/admin/me');
      if (response.data?.admin) {
        setProfile(response.data.admin);
      }
    } catch (err) {
      console.error(err);
      setError('Failed to fetch user profile details.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfile();
  }, []);

  const handleUpdatePassword = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');

    if (!passwordData.currentPassword || !passwordData.newPassword || !passwordData.confirmPassword) {
      setError('Please fill in all password fields.');
      return;
    }

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setError('New password and confirmation do not match.');
      return;
    }

    if (passwordData.newPassword.length < 6) {
      setError('New password must be at least 6 characters.');
      return;
    }

    try {
      setLoading(true);
      const response = await api.put('/admin/profile/password', passwordData);
      setMessage(response.data.message || 'Password updated successfully!');
      setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update password.');
    } finally {
      setLoading(false);
    }
  };

  const formatDateTime = (dateStr) => {
    if (!dateStr) return '-';
    const d = new Date(dateStr);
    return isNaN(d.getTime()) ? '-' : d.toLocaleString();
  };

  return (
    <div style={{ animation: 'fadeIn var(--transition-normal) ease-out', maxWidth: '850px' }}>
      <div style={{ marginBottom: 'var(--space-6)' }}>
        <h2 style={{ fontSize: '1.5rem', fontWeight: 'var(--weight-extrabold)', color: 'var(--text-primary)' }}>My Profile Settings</h2>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginTop: '2px' }}>
          View your system account details, security clearance level, and update your password credentials.
        </p>
      </div>

      {error && <div className="alert alert-danger">{error}</div>}
      {message && <div className="alert alert-success">{message}</div>}

      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1.8fr', gap: 'var(--space-6)', alignItems: 'flex-start' }}>
        
        {/* Profile Card Summary */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', padding: 'var(--space-8)' }}>
          {profile ? (
            <>
              <div style={{
                position: 'relative',
                width: '90px',
                height: '90px',
                borderRadius: '50%',
                background: 'linear-gradient(135deg, var(--primary), var(--accent-blue))',
                color: '#FFFFFF',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 'var(--weight-extrabold)',
                fontSize: '1.75rem',
                marginBottom: 'var(--space-4)',
                boxShadow: 'var(--shadow-md)',
                overflow: 'hidden'
              }}>
                {previewImage ? (
                  <img 
                    src={previewImage} 
                    alt="Preview" 
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
                  />
                ) : profile.profilePicture ? (
                  <img 
                    src={profile.profilePicture} 
                    alt="Profile" 
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
                  />
                ) : (
                  profile.fullName 
                    ? profile.fullName.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() 
                    : profile.email.slice(0, 2).toUpperCase()
                )}
              </div>

              {/* Upload photo controls */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)', width: '100%', alignItems: 'center', marginBottom: 'var(--space-4)' }}>
                <input
                  type="file"
                  id="profile-pic-input"
                  accept="image/*"
                  onChange={handleFileChange}
                  style={{ display: 'none' }}
                />
                
                {!previewImage ? (
                  <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
                    <button 
                      type="button" 
                      onClick={() => document.getElementById('profile-pic-input').click()} 
                      className="btn btn-outline btn-sm"
                      style={{ fontSize: '0.75rem', padding: '4px 10px' }}
                    >
                      {profile.profilePicture ? 'Replace Photo' : 'Upload Photo'}
                    </button>
                    {profile.profilePicture && (
                      <button 
                        type="button" 
                        onClick={handleRemovePicture} 
                        className="btn btn-danger btn-sm"
                        style={{ fontSize: '0.75rem', padding: '4px 10px', backgroundColor: 'transparent', borderColor: 'var(--color-danger)', color: 'var(--color-danger)' }}
                      >
                        Remove
                      </button>
                    )}
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.725rem', color: 'var(--accent-orange)', fontWeight: 'bold' }}>Unsaved Preview</span>
                    <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
                      <button 
                        type="button" 
                        onClick={handleSavePicture} 
                        className="btn btn-success btn-sm"
                        style={{ fontSize: '0.75rem', padding: '4px 12px', color: '#FFFFFF', backgroundColor: 'var(--color-success)', border: 'none', borderRadius: '4px' }}
                      >
                        Save Photo
                      </button>
                      <button 
                        type="button" 
                        onClick={() => { setPreviewImage(''); setSelectedFile(null); }} 
                        className="btn btn-outline btn-sm"
                        style={{ fontSize: '0.75rem', padding: '4px 12px' }}
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </div>

              <h3 style={{ fontSize: '1.15rem', fontWeight: 'var(--weight-extrabold)', color: 'var(--text-primary)' }}>
                {profile.fullName || 'System User'}
              </h3>
              <span className={`badge ${profile.role === 'admin' ? 'badge-pending' : profile.role === 'receptionist' ? 'badge-approved' : 'badge-checked-out'}`} style={{ marginTop: 'var(--space-2)', fontSize: '0.75rem', textTransform: 'capitalize' }}>
                {profile.role}
              </span>

              <div style={{ width: '100%', borderTop: '1px solid var(--border-secondary)', marginTop: 'var(--space-6)', paddingTop: 'var(--space-4)', display: 'flex', flexDirection: 'column', gap: 'var(--space-3)', textAlign: 'left' }}>
                <div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 'bold' }}>Email Address</div>
                  <div style={{ fontSize: '0.875rem', fontWeight: 'var(--weight-semibold)', color: 'var(--text-primary)', marginTop: '2px' }}>{profile.email}</div>
                </div>
                <div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 'bold' }}>Account Status</div>
                  <div style={{ fontSize: '0.875rem', fontWeight: 'var(--weight-semibold)', color: 'var(--text-primary)', marginTop: '2px', textTransform: 'capitalize' }}>{profile.status || 'Active'}</div>
                </div>
                <div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 'bold' }}>Registered Date</div>
                  <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '2px' }}>{formatDateTime(profile.createdAt)}</div>
                </div>
              </div>
            </>
          ) : (
            <div style={{ padding: 'var(--space-6)', color: 'var(--text-muted)' }}>Loading account profile...</div>
          )}
        </div>

        {/* Change Password Panel */}
        <div className="card">
          <h3 style={{ fontSize: '1.1rem', fontWeight: 'var(--weight-extrabold)', color: 'var(--text-primary)', marginBottom: 'var(--space-4)', borderBottom: '1px solid var(--border-secondary)', paddingBottom: 'var(--space-3)' }}>
            Change Password Credentials
          </h3>

          <form onSubmit={handleUpdatePassword} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
            <div className="form-group">
              <label className="form-label">Current Password</label>
              <input
                type="password"
                className="form-control"
                placeholder="••••••••"
                value={passwordData.currentPassword}
                onChange={(e) => setPasswordData(prev => ({ ...prev, currentPassword: e.target.value }))}
                required
                disabled={loading}
              />
            </div>

            <div className="form-grid">
              <div className="form-group">
                <label className="form-label">New Password</label>
                <input
                  type="password"
                  className="form-control"
                  placeholder="••••••••"
                  value={passwordData.newPassword}
                  onChange={(e) => setPasswordData(prev => ({ ...prev, newPassword: e.target.value }))}
                  required
                  disabled={loading}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Confirm Password</label>
                <input
                  type="password"
                  className="form-control"
                  placeholder="••••••••"
                  value={passwordData.confirmPassword}
                  onChange={(e) => setPasswordData(prev => ({ ...prev, confirmPassword: e.target.value }))}
                  required
                  disabled={loading}
                />
              </div>
            </div>

            <div className="form-actions" style={{ marginTop: 'var(--space-2)' }}>
              <button 
                type="submit" 
                className="btn btn-primary"
                disabled={loading}
              >
                {loading ? 'Saving credentials...' : 'Save Password'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Profile;
