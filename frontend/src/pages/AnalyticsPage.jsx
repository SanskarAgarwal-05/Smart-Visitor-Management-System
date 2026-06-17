import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/api';
import AnalyticsCharts from '../components/AnalyticsCharts';

const AnalyticsPage = () => {
  const [visitors, setVisitors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
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
          setError('Failed to fetch analytics datasets.');
        }
      } finally {
        setLoading(false);
      }
    };
    fetchVisitors();
  }, [navigate]);

  // Calculations
  const totalLogs = visitors.length;
  const checkoutCount = visitors.filter(v => v.status === 'checked-out').length;
  const approvedCount = visitors.filter(v => v.status === 'approved').length;
  const pendingCount = visitors.filter(v => v.status === 'pending').length;

  const checkoutRate = totalLogs > 0 ? Math.round((checkoutCount / totalLogs) * 100) : 0;
  const approvalRate = totalLogs > 0 ? Math.round(((approvedCount + checkoutCount) / totalLogs) * 100) : 0;

  return (
    <div style={{ animation: 'fadeIn var(--transition-normal) ease-out' }}>
      <div style={{ marginBottom: 'var(--space-6)' }}>
        <h2 style={{ fontSize: '1.5rem', fontWeight: 'var(--weight-extrabold)', color: 'var(--text-primary)' }}>System Analytics</h2>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginTop: '2px' }}>
          Statistical metrics for facility traffic, peak hours, and check-in conversions.
        </p>
      </div>

      {error && <div className="alert alert-danger">{error}</div>}

      {loading ? (
        <div style={{ padding: 'var(--space-12)', textAlign: 'center', color: 'var(--text-muted)' }}>Analyzing datasets...</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
          {/* Summary Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 'var(--space-5)' }}>
            <div className="card">
              <div style={{ fontSize: '0.75rem', fontWeight: 'bold', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Check-out Efficiency</div>
              <div style={{ fontSize: '1.75rem', fontWeight: 'var(--weight-extrabold)', marginTop: 'var(--space-2)', color: 'var(--text-primary)' }}>
                {checkoutRate}%
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--color-success)', marginTop: 'var(--space-1)', fontWeight: 'bold' }}>
                {checkoutCount} / {totalLogs} checked out
              </div>
            </div>

            <div className="card">
              <div style={{ fontSize: '0.75rem', fontWeight: 'bold', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Approval Rate</div>
              <div style={{ fontSize: '1.75rem', fontWeight: 'var(--weight-extrabold)', marginTop: 'var(--space-2)', color: 'var(--text-primary)' }}>
                {approvalRate}%
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--primary)', marginTop: 'var(--space-1)', fontWeight: 'bold' }}>
                {totalLogs - pendingCount} authorized visits
              </div>
            </div>

            <div className="card">
              <div style={{ fontSize: '0.75rem', fontWeight: 'bold', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Active In-House Visitors</div>
              <div style={{ fontSize: '1.75rem', fontWeight: 'var(--weight-extrabold)', marginTop: 'var(--space-2)', color: 'var(--text-primary)' }}>
                {approvedCount}
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--accent-orange)', marginTop: 'var(--space-1)', fontWeight: 'bold' }}>
                Awaiting departure log
              </div>
            </div>
          </div>

          {/* Render charts */}
          <AnalyticsCharts visitors={visitors} />
        </div>
      )}
    </div>
  );
};

export default AnalyticsPage;
