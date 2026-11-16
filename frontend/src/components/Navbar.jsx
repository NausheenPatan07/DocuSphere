import React, { useState, useRef, useEffect } from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  Search,
  Bell,
  ChevronDown,
  User,
  Shield,
  Building,
  LogOut,
  ExternalLink,
  CheckCircle2,
} from 'lucide-react';

const Navbar = ({ onToggleSidebar }) => {
  const { user, logout, role, divisionName } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const [searchQuery, setSearchQuery] = useState('');
  const [profileOpen, setProfileOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const dropdownRef = useRef(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setProfileOpen(false);
        setNotificationsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleGlobalSearch = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
      setSearchQuery('');
    }
  };

  // Determine page title & breadcrumbs
  const getPageMeta = () => {
    const path = location.pathname;
    if (path === '/dashboard') return { title: 'Enterprise Dashboard', breadcrumb: 'Overview' };
    if (path === '/documents') return { title: 'Document Repository', breadcrumb: 'Documents' };
    if (path.startsWith('/documents/')) return { title: 'Document Inspector', breadcrumb: 'Documents / Details' };
    if (path === '/upload') return { title: 'Upload & Process Document', breadcrumb: 'Upload' };
    if (path === '/search') return { title: 'OCR Full-Text Search', breadcrumb: 'Advanced Search' };
    if (path === '/access-requests') return { title: 'Cross-Division Access', breadcrumb: 'Access Control' };
    if (path === '/settings') return { title: 'Governance & Settings', breadcrumb: 'Administration' };
    return { title: 'DocuSphere', breadcrumb: 'App' };
  };

  const { title, breadcrumb } = getPageMeta();

  return (
    <header
      style={{
        height: '64px',
        backgroundColor: '#ffffff',
        borderBottom: '1px solid #e2e8f0',
        padding: '0 28px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        position: 'sticky',
        top: 0,
        zIndex: 40,
        boxShadow: '0 1px 2px 0 rgba(15, 23, 42, 0.04)',
      }}
    >
      {/* Page Title & Breadcrumb */}
      <div>
        <div style={{ fontSize: '11.5px', color: '#64748b', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
          {breadcrumb}
        </div>
        <h1 style={{ fontSize: '17px', fontWeight: 700, color: '#0f172a', margin: 0 }}>
          {title}
        </h1>
      </div>

      {/* Global Quick Search */}
      <form
        onSubmit={handleGlobalSearch}
        style={{
          width: '380px',
          maxWidth: '100%',
          position: 'relative',
        }}
        className="navbar-search-desktop"
      >
        <span
          style={{
            position: 'absolute',
            left: '12px',
            top: '50%',
            transform: 'translateY(-50%)',
            color: '#94a3b8',
            pointerEvents: 'none',
            display: 'flex',
          }}
        >
          <Search size={16} />
        </span>
        <input
          type="text"
          placeholder="Search extracted OCR text, metadata, filenames..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          style={{
            width: '100%',
            height: '38px',
            padding: '0 12px 0 36px',
            fontSize: '13px',
            backgroundColor: '#f8fafc',
            border: '1px solid #e2e8f0',
            borderRadius: '8px',
            color: '#0f172a',
            outline: 'none',
            transition: 'all 0.15s ease',
          }}
          onFocus={(e) => {
            e.target.style.backgroundColor = '#ffffff';
            e.target.style.borderColor = '#0284c7';
            e.target.style.boxShadow = '0 0 0 3px rgba(2, 132, 199, 0.1)';
          }}
          onBlur={(e) => {
            e.target.style.backgroundColor = '#f8fafc';
            e.target.style.borderColor = '#e2e8f0';
            e.target.style.boxShadow = 'none';
          }}
        />
      </form>

      {/* Right controls */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }} ref={dropdownRef}>
        {/* Division indicator badge */}
        {divisionName && (
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '5px 12px',
              borderRadius: '999px',
              backgroundColor: '#e0f2fe',
              color: '#0369a1',
              fontSize: '12px',
              fontWeight: 600,
              border: '1px solid #bae6fd',
            }}
          >
            <Building size={13} />
            <span>{divisionName}</span>
          </div>
        )}

        {/* Notifications toggle button */}
        <div style={{ position: 'relative' }}>
          <button
            onClick={() => {
              setNotificationsOpen(!notificationsOpen);
              setProfileOpen(false);
            }}
            style={{
              width: '38px',
              height: '38px',
              borderRadius: '8px',
              border: '1px solid #e2e8f0',
              backgroundColor: '#ffffff',
              color: '#64748b',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              position: 'relative',
              transition: 'background-color 0.15s ease',
            }}
            title="System notifications"
          >
            <Bell size={17} />
            <span
              style={{
                position: 'absolute',
                top: '7px',
                right: '7px',
                width: '7px',
                height: '7px',
                borderRadius: '50%',
                backgroundColor: '#0ea5e9',
              }}
            />
          </button>

          {/* Notifications Dropdown */}
          {notificationsOpen && (
            <div
              style={{
                position: 'absolute',
                right: 0,
                top: '46px',
                width: '300px',
                backgroundColor: '#ffffff',
                borderRadius: '12px',
                boxShadow: '0 10px 25px -5px rgba(15, 23, 42, 0.15)',
                border: '1px solid #e2e8f0',
                padding: '16px',
                zIndex: 60,
              }}
            >
              <div style={{ fontWeight: 700, fontSize: '13.5px', color: '#0f172a', marginBottom: '8px' }}>
                System Activity & Security
              </div>
              <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-start', padding: '8px 0', borderBottom: '1px solid #f1f5f9' }}>
                <CheckCircle2 size={16} style={{ color: '#10b981', marginTop: '2px', flexShrink: 0 }} />
                <div style={{ fontSize: '12.5px', color: '#334155' }}>
                  OCR Worker is active and processing documents into text index.
                </div>
              </div>
              <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-start', padding: '8px 0' }}>
                <Shield size={16} style={{ color: '#0284c7', marginTop: '2px', flexShrink: 0 }} />
                <div style={{ fontSize: '12.5px', color: '#334155' }}>
                  Division isolation policy active. Cross-division files require request approval.
                </div>
              </div>
            </div>
          )}
        </div>

        {/* User Profile Menu */}
        <div style={{ position: 'relative' }}>
          <button
            onClick={() => {
              setProfileOpen(!profileOpen);
              setNotificationsOpen(false);
            }}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              padding: '4px 10px 4px 4px',
              borderRadius: '30px',
              border: '1px solid #e2e8f0',
              backgroundColor: '#ffffff',
              cursor: 'pointer',
              transition: 'background-color 0.15s ease',
            }}
          >
            <div
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '50%',
                background: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)',
                color: '#ffffff',
                fontWeight: 700,
                fontSize: '13px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {user?.name ? user.name.charAt(0).toUpperCase() : 'U'}
            </div>
            <span style={{ fontSize: '13.5px', fontWeight: 600, color: '#1e293b' }}>
              {user?.name?.split(' ')[0] || 'User'}
            </span>
            <ChevronDown size={14} style={{ color: '#94a3b8' }} />
          </button>

          {/* User Dropdown */}
          {profileOpen && (
            <div
              style={{
                position: 'absolute',
                right: 0,
                top: '46px',
                width: '240px',
                backgroundColor: '#ffffff',
                borderRadius: '12px',
                boxShadow: '0 10px 25px -5px rgba(15, 23, 42, 0.15)',
                border: '1px solid #e2e8f0',
                padding: '12px',
                zIndex: 60,
              }}
            >
              <div style={{ padding: '6px 8px 10px', borderBottom: '1px solid #f1f5f9' }}>
                <div style={{ fontWeight: 700, fontSize: '13.5px', color: '#0f172a' }}>{user?.name}</div>
                <div style={{ fontSize: '12px', color: '#64748b' }}>{user?.email}</div>
                <div style={{ marginTop: '6px', fontSize: '11px', fontWeight: 700, color: '#0284c7', textTransform: 'uppercase' }}>
                  Role: {role}
                </div>
              </div>

              <div style={{ padding: '8px 0' }}>
                <Link
                  to="/settings"
                  onClick={() => setProfileOpen(false)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    padding: '8px 10px',
                    fontSize: '13px',
                    color: '#334155',
                    borderRadius: '6px',
                    textDecoration: 'none',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#f8fafc')}
                  onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                >
                  <Shield size={16} />
                  <span>Security & Settings</span>
                </Link>
                <Link
                  to="/access-requests"
                  onClick={() => setProfileOpen(false)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    padding: '8px 10px',
                    fontSize: '13px',
                    color: '#334155',
                    borderRadius: '6px',
                    textDecoration: 'none',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#f8fafc')}
                  onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                >
                  <User size={16} />
                  <span>My Access Requests</span>
                </Link>
              </div>

              <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: '6px' }}>
                <button
                  onClick={() => {
                    setProfileOpen(false);
                    logout();
                    navigate('/login');
                  }}
                  style={{
                    width: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    padding: '8px 10px',
                    fontSize: '13px',
                    color: '#ef4444',
                    border: 'none',
                    backgroundColor: 'transparent',
                    cursor: 'pointer',
                    borderRadius: '6px',
                    textAlign: 'left',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#fef2f2')}
                  onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                >
                  <LogOut size={16} />
                  <span>Sign Out</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

export default Navbar;
