import React, { useState, useEffect } from 'react';
import api from '../api/api';

const VisitorForm = ({ visitor, onSave, onClose }) => {
  const [formData, setFormData] = useState({
    fullName: '',
    phoneNumber: '',
    email: '',
    purposeOfVisit: '',
    personToMeet: '',
    status: 'pending',
  });
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const isEditMode = !!visitor;

  useEffect(() => {
    if (visitor) {
      setFormData({
        fullName: visitor.fullName || '',
        phoneNumber: visitor.phoneNumber || '',
        email: visitor.email || '',
        purposeOfVisit: visitor.purposeOfVisit || '',
        personToMeet: visitor.personToMeet || '',
        status: visitor.status || 'pending',
      });
    }
  }, [visitor]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    const { fullName, phoneNumber, purposeOfVisit, personToMeet } = formData;
    if (!fullName || !phoneNumber || !purposeOfVisit || !personToMeet) {
      setError('Please fill in all required fields.');
      setLoading(false);
      return;
    }

    try {
      if (isEditMode) {
        const response = await api.put(`/visitor/${visitor._id || visitor.visitorId}`, formData);
        setSuccess('Visitor record updated successfully!');
        setTimeout(() => {
          onSave(response.data.visitor);
        }, 800);
      } else {
        const response = await api.post('/visitor', formData);
        setSuccess('Visitor registered successfully!');
        setTimeout(() => {
          onSave(response.data.visitor);
        }, 800);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Something went wrong. Please check your data and try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
      {error && <div className="alert alert-danger">{error}</div>}
      {success && <div className="alert alert-success">{success}</div>}
      
      <div className="form-group">
        <label className="form-label">Full Name <span style={{ color: 'var(--accent-orange)' }}>*</span></label>
        <input
          type="text"
          name="fullName"
          value={formData.fullName}
          onChange={handleChange}
          className="form-control"
          placeholder="e.g. John Doe"
          required
          disabled={loading}
        />
      </div>

      <div className="form-grid">
        <div className="form-group">
          <label className="form-label">Phone Number <span style={{ color: 'var(--accent-orange)' }}>*</span></label>
          <input
            type="tel"
            name="phoneNumber"
            value={formData.phoneNumber}
            onChange={handleChange}
            className="form-control"
            placeholder="e.g. +1 (555) 019-2834"
            required
            disabled={loading}
          />
        </div>
        
        <div className="form-group">
          <label className="form-label">Email (Optional)</label>
          <input
            type="email"
            name="email"
            value={formData.email}
            onChange={handleChange}
            className="form-control"
            placeholder="e.g. john@company.com"
            disabled={loading}
          />
        </div>
      </div>

      <div className="form-grid">
        <div className="form-group">
          <label className="form-label">Purpose of Visit <span style={{ color: 'var(--accent-orange)' }}>*</span></label>
          <input
            type="text"
            name="purposeOfVisit"
            value={formData.purposeOfVisit}
            onChange={handleChange}
            className="form-control"
            placeholder="e.g. Interview, Vendor meeting..."
            required
            disabled={loading}
          />
        </div>

        <div className="form-group">
          <label className="form-label">Person to Meet <span style={{ color: 'var(--accent-orange)' }}>*</span></label>
          <input
            type="text"
            name="personToMeet"
            value={formData.personToMeet}
            onChange={handleChange}
            className="form-control"
            placeholder="e.g. Sarah Jenkins (HR)"
            required
            disabled={loading}
          />
        </div>
      </div>

      {isEditMode && (
        <div className="form-group">
          <label className="form-label">Status</label>
          <select
            name="status"
            value={formData.status}
            onChange={handleChange}
            className="form-control"
            disabled={loading}
          >
            <option value="pending">Pending</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
            <option value="checked-out">Checked Out</option>
          </select>
        </div>
      )}

      <div className="form-actions">
        <button type="button" onClick={onClose} className="btn btn-outline" disabled={loading}>
          Cancel
        </button>
        <button type="submit" className="btn btn-primary" disabled={loading}>
          {loading ? (
            <>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" style={{ animation: 'spin 1s linear infinite', marginRight: '4px' }}>
                <circle cx="12" cy="12" r="10" strokeDasharray="32" />
              </svg>
              Saving...
            </>
          ) : isEditMode ? 'Update Record' : 'Register & Check-In'}
        </button>
      </div>

      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </form>
  );
};

export default VisitorForm;
