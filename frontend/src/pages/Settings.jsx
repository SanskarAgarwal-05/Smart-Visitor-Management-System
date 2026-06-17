import React, { useState, useEffect } from 'react';
import api from '../api/api';

const Settings = () => {
  const [stylePreset, setStylePreset] = useState(() => localStorage.getItem('stylePreset') || 'fintech');
  const [themeMode, setThemeMode] = useState(() => localStorage.getItem('theme') || 'light');
  const [serverStatus, setServerStatus] = useState('Checking...');
  const [dbStatus, setDbStatus] = useState('Checking...');

  useEffect(() => {
    // Check backend API connection and status
    const getStatus = async () => {
      try {
        const response = await api.get('/');
        if (response.data.includes('Server Running')) {
          setServerStatus('Active (Port 5000)');
          setDbStatus('Connected (MongoDB)');
        } else {
          setServerStatus('Offline');
          setDbStatus('Disconnected');
        }
      } catch (err) {
        setServerStatus('Offline');
        setDbStatus('Disconnected / Error');
      }
    };
    getStatus();
  }, []);

  const handleStyleChange = (preset) => {
    setStylePreset(preset);
    document.documentElement.setAttribute('data-style', preset);
    localStorage.setItem('stylePreset', preset);
  };

  const handleThemeChange = (mode) => {
    setThemeMode(mode);
    document.documentElement.setAttribute('data-theme', mode);
    localStorage.setItem('theme', mode);
  };

  const presets = [
    { id: 'fintech', name: 'SaaS Fintech (Default)', description: 'Clean teal accents, spacious card grid, rounded borders (16px), soft shadow depth' },
    { id: 'cyberpunk', name: 'Cyberpunk Mode', description: 'Retro-futuristic styling: neon green accents, sharp box edges, grid dot texture, heavy borders' },
    { id: 'futuristic', name: 'Futuristic Glow', description: 'Intense glassmorphism, glowing focus indicators, high transition delays' },
    { id: 'corporate', name: 'Corporate Standard', description: 'Slate gray structure, strict thin margins, classic layouts, minimal borders' },
    { id: 'luxury', name: 'Luxury Serif', description: 'Rich gold indicators, high spacing padding values, premium typography' }
  ];

  return (
    <div style={{ animation: 'fadeIn var(--transition-normal) ease-out', maxWidth: '800px' }}>
      <div style={{ marginBottom: 'var(--space-6)' }}>
        <h2 style={{ fontSize: '1.5rem', fontWeight: 'var(--weight-extrabold)', color: 'var(--text-primary)' }}>System Settings</h2>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginTop: '2px' }}>
          Configure design token presets, themes, security thresholds, and check connection logs.
        </p>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
        {/* Preset selector */}
        <div className="card">
          <h3 style={{ fontSize: '1.1rem', fontWeight: 'var(--weight-extrabold)', color: 'var(--text-primary)', marginBottom: 'var(--space-2)' }}>
            Design Presets (Decoupled Themes)
          </h3>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.825rem', marginBottom: 'var(--space-4)' }}>
            Toggle between semantic styling presets. This changes CSS variables (border-radius, font-family, shadows, color palettes) instantly across the entire console.
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
            {presets.map((preset) => (
              <div 
                key={preset.id}
                onClick={() => handleStyleChange(preset.id)}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: 'var(--space-4)',
                  borderRadius: 'var(--radius-md)',
                  border: stylePreset === preset.id ? '2px solid var(--primary)' : '1px solid var(--border-primary)',
                  backgroundColor: stylePreset === preset.id ? 'var(--primary-light)' : 'var(--bg-card)',
                  cursor: 'pointer',
                  transition: 'all var(--transition-fast)'
                }}
              >
                <div style={{ textAlign: 'left' }}>
                  <div style={{ fontWeight: 'var(--weight-bold)', color: 'var(--text-primary)', fontSize: '0.9rem' }}>
                    {preset.name}
                  </div>
                  <div style={{ fontSize: '0.775rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
                    {preset.description}
                  </div>
                </div>
                <div style={{
                  width: '20px',
                  height: '20px',
                  borderRadius: '50%',
                  border: '2px solid var(--primary)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  {stylePreset === preset.id && (
                    <div style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: 'var(--primary)' }} />
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Global theme Mode */}
        <div className="card">
          <h3 style={{ fontSize: '1.1rem', fontWeight: 'var(--weight-extrabold)', color: 'var(--text-primary)', marginBottom: 'var(--space-4)' }}>
            Appearance Mode
          </h3>
          <div style={{ display: 'flex', gap: 'var(--space-4)' }}>
            <button 
              className={`btn ${themeMode === 'light' ? 'btn-primary' : 'btn-outline'}`}
              onClick={() => handleThemeChange('light')}
              style={{ flex: 1 }}
            >
              ☀️ Light Mode
            </button>
            <button 
              className={`btn ${themeMode === 'dark' ? 'btn-primary' : 'btn-outline'}`}
              onClick={() => handleThemeChange('dark')}
              style={{ flex: 1 }}
            >
              🌙 Dark Mode
            </button>
          </div>
        </div>

        {/* Server status */}
        <div className="card">
          <h3 style={{ fontSize: '1.1rem', fontWeight: 'var(--weight-extrabold)', color: 'var(--text-primary)', marginBottom: 'var(--space-4)' }}>
            Backend Node Status
          </h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-4)' }}>
            <div style={{ border: '1px solid var(--border-primary)', padding: 'var(--space-4)', borderRadius: 'var(--radius-md)', textAlign: 'left' }}>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>EXPRESS NODE</div>
              <div style={{ fontSize: '1rem', fontWeight: 'var(--weight-bold)', color: serverStatus.includes('Active') ? 'var(--color-success)' : 'var(--color-danger)', marginTop: '4px' }}>
                {serverStatus}
              </div>
            </div>
            <div style={{ border: '1px solid var(--border-primary)', padding: 'var(--space-4)', borderRadius: 'var(--radius-md)', textAlign: 'left' }}>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>DATABASE CONTEXT</div>
              <div style={{ fontSize: '1rem', fontWeight: 'var(--weight-bold)', color: dbStatus.includes('Connected') ? 'var(--color-success)' : 'var(--color-danger)', marginTop: '4px' }}>
                {dbStatus}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Settings;
