import React from 'react';
import { useNavigate } from 'react-router-dom';
import VisitorForm from '../components/VisitorForm';

const Register = () => {
  const navigate = useNavigate();

  const handleSave = () => {
    // On success, redirect to dashboard or visitor list
    navigate('/visitors');
  };

  return (
    <div style={{ animation: 'fadeIn var(--transition-normal) ease-out', maxWidth: '680px', margin: '0 auto' }}>
      <div style={{ marginBottom: 'var(--space-6)' }}>
        <h2 style={{ fontSize: '1.5rem', fontWeight: 'var(--weight-extrabold)', color: 'var(--text-primary)' }}>Register Visitor</h2>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginTop: '2px' }}>
          Input details to issue check-in passes and authorize entry logs.
        </p>
      </div>

      <div className="card" style={{ padding: 'var(--space-6)' }}>
        <h3 style={{ fontSize: '1.1rem', fontWeight: 'var(--weight-extrabold)', color: 'var(--text-primary)', marginBottom: 'var(--space-5)', borderBottom: '1px solid var(--border-secondary)', paddingBottom: 'var(--space-3)' }}>
          Entry Authorization Form
        </h3>
        <VisitorForm 
          onSave={handleSave} 
          onClose={() => navigate('/dashboard')} 
        />
      </div>
    </div>
  );
};

export default Register;
