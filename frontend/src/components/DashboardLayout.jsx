import React, { useState, useEffect, useRef } from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import api from '../api/api';

const DashboardLayout = ({ children }) => {
  const [collapsed, setCollapsed] = useState(false);
  const [theme, setTheme] = useState(() => localStorage.getItem('theme') || 'light');
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  
  const navigate = useNavigate();
  const location = useLocation();
  
  const profileMenuRef = useRef(null);
  const notifMenuRef = useRef(null);

  // Fetch current user details
  const fetchMe = async () => {
    try {
      const response = await api.get('/admin/me');
      if (response.data?.admin) {
        setCurrentUser(response.data.admin);
      }
    } catch (err) {
      console.error('Failed to fetch user info', err);
    }
  };

  useEffect(() => {
    fetchMe();
    window.addEventListener('profileUpdated', fetchMe);
    return () => {
      window.removeEventListener('profileUpdated', fetchMe);
    };
  }, []);

  // Sync theme with HTML attribute
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
    const preset = localStorage.getItem('stylePreset') || 'fintech';
    document.documentElement.setAttribute('data-style', preset);
  }, [theme]);

  // Click outside listener for dropdowns
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (profileMenuRef.current && !profileMenuRef.current.contains(event.target)) {
        setShowProfileMenu(false);
      }
      if (notifMenuRef.current && !notifMenuRef.current.contains(event.target)) {
        setShowNotifications(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Fetch recent notifications (recent check-ins)
  useEffect(() => {
    const fetchRecentAlerts = async () => {
      try {
        const response = await api.get('/visitor');
        const list = response.data.visitors || [];
        
        // Filter and map to useful notifications only: Registered, Approved, Checked-Out
        const alerts = list.slice(0, 8).map((v, idx) => {
          let msg = '';
          let timeStr = new Date(v.checkInTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
          if (v.status === 'checked-out') {
            msg = `${v.fullName} has checked out.`;
          } else if (v.status === 'approved') {
            msg = `${v.fullName}'s entry has been approved.`;
          } else if (v.status === 'rejected') {
            msg = `${v.fullName}'s entry request was rejected.`;
          } else {
            msg = `New visitor ${v.fullName} registered (Pending approval).`;
          }
          return {
            id: v._id || idx,
            message: msg,
            time: timeStr,
            unread: true // Initialize as unread for demo/polling, can mark read locally
          };
        });
        setNotifications(alerts);
      } catch (err) {
        console.error('Failed to load notifications', err);
        setNotifications([
          { id: '1', message: 'New visitor John Doe registered (Pending approval).', time: '10:30 AM', unread: true },
          { id: '2', message: 'Visitor Jane Smith has checked out.', time: '09:15 AM', unread: true }
        ]);
      }
    };

    fetchRecentAlerts();
    const interval = setInterval(fetchRecentAlerts, 50000);
    return () => clearInterval(interval);
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('adminToken');
    localStorage.removeItem('userRole');
    localStorage.removeItem('userEmail');
    localStorage.removeItem('userFullName');
    navigate('/login');
  };

  const toggleTheme = () => {
    setTheme(prev => prev === 'light' ? 'dark' : 'light');
  };

  const markAsRead = (id) => {
    setNotifications(prev =>
      prev.map(n => n.id === id ? { ...n, unread: false } : n)
    );
  };

  const markAllAsRead = () => {
    setNotifications(prev =>
      prev.map(n => ({ ...n, unread: false }))
    );
  };

  const hasUnread = notifications.some(n => n.unread);

  const getPageTitle = () => {
    switch (location.pathname) {
      case '/dashboard':
        return 'Dashboard';
      case '/register':
        return 'Register Visitor';
      case '/visitors':
        return 'Visitor Logs';
      case '/roles':
        return 'Roles & Permissions';
      case '/profile':
        return 'My Profile';
      default:
        return 'Smart Visitor Management';
    }
  };

  return (
    <div className="app-container">
      {/* SIDEBAR */}
      <aside className={`sidebar ${collapsed ? 'collapsed' : ''}`}>
        <NavLink to="/dashboard" className="sidebar-brand">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
            <circle cx="9" cy="7" r="4" />
            <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
            <path d="M16 3.13a4 4 0 0 1 0 7.75" />
          </svg>
          {!collapsed && <span>VisitorPortal</span>}
        </NavLink>

        <ul className="sidebar-menu">
          <li>
            <NavLink to="/dashboard" className={({ isActive }) => `sidebar-menu-item ${isActive ? 'active' : ''}`}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="3" width="7" height="9" />
                <rect x="14" y="3" width="7" height="5" />
                <rect x="14" y="12" width="7" height="9" />
                <rect x="3" y="16" width="7" height="5" />
              </svg>
              {!collapsed && <span>Dashboard</span>}
            </NavLink>
          </li>
          {(currentUser?.role === 'admin' || currentUser?.role === 'receptionist' || localStorage.getItem('userRole') === 'admin' || localStorage.getItem('userRole') === 'receptionist') && (
            <li>
              <NavLink to="/register" className={({ isActive }) => `sidebar-menu-item ${isActive ? 'active' : ''}`}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                  <circle cx="8.5" cy="7" r="4" />
                  <line x1="20" y1="8" x2="20" y2="14" />
                  <line x1="23" y1="11" x2="17" y2="11" />
                </svg>
                {!collapsed && <span>Register Visitor</span>}
              </NavLink>
            </li>
          )}
          <li>
            <NavLink to="/visitors" className={({ isActive }) => `sidebar-menu-item ${isActive ? 'active' : ''}`}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                <line x1="16" y1="2" x2="16" y2="6" />
                <line x1="8" y1="2" x2="8" y2="6" />
                <line x1="3" y1="10" x2="21" y2="10" />
              </svg>
              {!collapsed && <span>Visitor Logs</span>}
            </NavLink>
          </li>
          {(currentUser?.role === 'admin' || localStorage.getItem('userRole') === 'admin') && (
            <li>
              <NavLink to="/roles" className={({ isActive }) => `sidebar-menu-item ${isActive ? 'active' : ''}`}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                </svg>
                {!collapsed && <span>Roles & Permissions</span>}
              </NavLink>
            </li>
          )}
          <li>
            <NavLink to="/profile" className={({ isActive }) => `sidebar-menu-item ${isActive ? 'active' : ''}`}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                <circle cx="12" cy="7" r="4" />
              </svg>
              {!collapsed && <span>Profile</span>}
            </NavLink>
          </li>
        </ul>

        <div className="sidebar-footer">
          <button onClick={handleLogout} className="sidebar-menu-item" style={{ width: '100%', background: 'none', border: 'none', textAlign: 'left' }}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
              <polyline points="16 17 21 12 16 7" />
              <line x1="21" y1="12" x2="9" y2="12" />
            </svg>
            {!collapsed && <span>Log Out</span>}
          </button>
        </div>
      </aside>

      {/* MAIN CONTENT AREA */}
      <div className={`main-content ${collapsed ? 'sidebar-collapsed' : ''}`}>
        {/* TOP NAVBAR */}
        <header className="top-navbar">
          <div className="navbar-left">
            <button className="sidebar-toggle" onClick={() => setCollapsed(!collapsed)} aria-label="Toggle Sidebar">
              <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="3" y1="12" x2="21" y2="12" />
                <line x1="3" y1="6" x2="21" y2="6" />
                <line x1="3" y1="18" x2="21" y2="18" />
              </svg>
            </button>
            <span className="navbar-page-title">{getPageTitle()}</span>
          </div>

          <div className="navbar-right">
            {/* Theme Toggle */}
            <button className="navbar-icon-btn" onClick={toggleTheme} title="Toggle Theme">
              {theme === 'light' ? (
                <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
                </svg>
              ) : (
                <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="5" />
                  <line x1="12" y1="1" x2="12" y2="3" />
                  <line x1="12" y1="21" x2="12" y2="23" />
                  <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
                  <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
                  <line x1="1" y1="12" x2="3" y2="12" />
                  <line x1="21" y1="12" x2="23" y2="12" />
                  <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
                  <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
                </svg>
              )}
            </button>

            {/* Notifications Trigger */}
            <div style={{ position: 'relative' }} ref={notifMenuRef}>
              <button 
                className="navbar-icon-btn" 
                onClick={() => setShowNotifications(!showNotifications)}
                title="Notifications"
              >
                <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                  <path d="M13.73 21a2 2 0 0 1-3.46 0" />
                </svg>
                {hasUnread && <span className="navbar-icon-badge" />}
              </button>

              {showNotifications && (
                <div className="dropdown-menu">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: 'var(--space-3) var(--space-4)', borderBottom: '1px solid var(--border-secondary)' }}>
                    <span style={{ fontSize: '0.8rem', fontWeight: 'bold', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                      Notifications
                    </span>
                    {hasUnread && (
                      <button 
                        onClick={markAllAsRead} 
                        style={{ background: 'none', border: 'none', color: 'var(--primary)', fontSize: '0.75rem', fontWeight: 'bold', cursor: 'pointer' }}
                      >
                        Mark all as read
                      </button>
                    )}
                  </div>
                  <div style={{ maxHeight: '240px', overflowY: 'auto' }}>
                    {notifications.length === 0 ? (
                      <div style={{ padding: '16px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                        No notifications
                      </div>
                    ) : (
                      notifications.map(n => (
                        <div 
                          key={n.id} 
                          className="dropdown-item" 
                          onClick={() => markAsRead(n.id)}
                          style={{ 
                            display: 'flex', 
                            flexDirection: 'column', 
                            alignItems: 'flex-start',
                            fontWeight: n.unread ? '600' : 'normal',
                            borderLeft: n.unread ? '3px solid var(--primary)' : 'none',
                            paddingLeft: n.unread ? '13px' : '16px',
                            cursor: 'pointer'
                          }}
                        >
                          <span style={{ fontSize: '0.825rem' }}>{n.message}</span>
                          <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '2px' }}>{n.time}</span>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            <div className="navbar-divider" />

            {/* Profile Menu */}
            <div style={{ position: 'relative' }} ref={profileMenuRef}>
              <div className="navbar-profile" onClick={() => setShowProfileMenu(!showProfileMenu)}>
                <div className="profile-avatar" style={{ overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {currentUser?.profilePicture ? (
                    <img 
                      src={currentUser.profilePicture} 
                      alt="Profile" 
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
                    />
                  ) : (
                    currentUser?.fullName 
                      ? currentUser.fullName.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() 
                      : (currentUser?.email ? currentUser.email.slice(0, 2).toUpperCase() : 'AD')
                  )}
                </div>
                <div className="profile-info">
                  <span className="profile-name">
                    {currentUser?.fullName || (currentUser?.email ? currentUser.email.split('@')[0] : 'Admin')}
                  </span>
                  <span className="profile-role" style={{ textTransform: 'capitalize' }}>
                    {currentUser?.role || 'Control Panel'}
                  </span>
                </div>
              </div>

              {showProfileMenu && (
                <div className="dropdown-menu">
                  <div className="dropdown-header" style={{ textTransform: 'capitalize' }}>
                    {currentUser?.fullName || 'System User'} ({currentUser?.role || 'Admin'})
                  </div>
                  <div className="dropdown-item" onClick={() => { setShowProfileMenu(false); navigate('/profile'); }}>
                    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                      <circle cx="12" cy="7" r="4" />
                    </svg>
                    <span>My Profile</span>
                  </div>
                  <div className="dropdown-item" onClick={handleLogout} style={{ color: 'var(--color-danger)' }}>
                    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                      <polyline points="16 17 21 12 16 7" />
                      <line x1="21" y1="12" x2="9" y2="12" />
                    </svg>
                    <span>Logout</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* PAGE BODY */}
        <main className="page-container fade-in">
          {children}
        </main>
      </div>
    </div>
  );
};

export default DashboardLayout;
