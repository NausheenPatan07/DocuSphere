import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  LayoutDashboard,
  Files,
  UploadCloud,
  Search,
  KeyRound,
  Settings,
  LogOut,
  ChevronLeft,
  ChevronRight,
  Shield,
  Layers,
  Sparkles,
  History,
} from 'lucide-react';

const Sidebar = ({ collapsed, setCollapsed }) => {
  const { user, logout, role, divisionName } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const navItems = [
    { name: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
    { name: 'Documents', path: '/documents', icon: Files },
    { name: 'Upload Document', path: '/upload', icon: UploadCloud },
    { name: 'Advanced Search', path: '/search', icon: Search },
    { name: 'Access Requests', path: '/access-requests', icon: KeyRound },
    ...(role === 'admin'
      ? [{ name: 'Audit Logs', path: '/audit-logs', icon: History }]
      : []),
    { name: 'Settings', path: '/settings', icon: Settings },
  ];

  const getRoleBadge = (roleStr) => {
    switch (roleStr) {
      case 'admin':
        return { label: 'System Admin', bg: '#fee2e2', color: '#991b1b' };
      case 'division_admin':
        return { label: 'Division Admin', bg: '#fef3c7', color: '#92400e' };
      default:
        return { label: 'Employee', bg: '#e0f2fe', color: '#0369a1' };
    }
  };

  const badge = getRoleBadge(role);

  return (
    <aside
      style={{
        width: collapsed ? '78px' : '260px',
        minHeight: '100vh',
        backgroundColor: '#0f172a',
        color: '#f8fafc',
        display: 'flex',
        flexDirection: 'column',
        transition: 'width 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
        position: 'sticky',
        top: 0,
        zIndex: 50,
        borderRight: '1px solid rgba(255, 255, 255, 0.08)',
        flexShrink: 0,
      }}
    >
      {/* Brand Header */}
      <div
        style={{
          height: '64px',
          padding: collapsed ? '0 16px' : '0 20px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: collapsed ? 'center' : 'space-between',
          borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              width: '36px',
              height: '36px',
              borderRadius: '10px',
              background: 'linear-gradient(135deg, #0284c7 0%, #0d9488 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#ffffff',
              boxShadow: '0 4px 12px rgba(2, 132, 199, 0.3)',
              flexShrink: 0,
            }}
          >
            <Layers size={20} />
          </div>

          {!collapsed && (
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <span
                style={{
                  fontSize: '17px',
                  fontWeight: 800,
                  letterSpacing: '-0.02em',
                  color: '#ffffff',
                }}
              >
                Docu<span style={{ color: '#38bdf8' }}>Sphere</span>
              </span>
              <span
                style={{
                  fontSize: '10px',
                  fontWeight: 600,
                  color: '#94a3b8',
                  textTransform: 'uppercase',
                  letterSpacing: '0.08em',
                }}
              >
                AI Division DMS
              </span>
            </div>
          )}
        </div>

        {!collapsed && (
          <button
            onClick={() => setCollapsed(true)}
            style={{
              background: 'rgba(255, 255, 255, 0.05)',
              border: 'none',
              borderRadius: '6px',
              padding: '6px',
              color: '#94a3b8',
              cursor: 'pointer',
              display: 'flex',
            }}
            title="Collapse sidebar"
          >
            <ChevronLeft size={16} />
          </button>
        )}
      </div>

      {collapsed && (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '10px 0' }}>
          <button
            onClick={() => setCollapsed(false)}
            style={{
              background: 'rgba(255, 255, 255, 0.05)',
              border: 'none',
              borderRadius: '6px',
              padding: '6px',
              color: '#94a3b8',
              cursor: 'pointer',
              display: 'flex',
            }}
            title="Expand sidebar"
          >
            <ChevronRight size={16} />
          </button>
        </div>
      )}

      {/* Navigation Links */}
      <nav
        style={{
          flex: 1,
          padding: '16px 12px',
          display: 'flex',
          flexDirection: 'column',
          gap: '4px',
          overflowY: 'auto',
        }}
      >
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.path}
              to={item.path}
              style={({ isActive }) => ({
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: collapsed ? '10px 0' : '10px 14px',
                justifyContent: collapsed ? 'center' : 'flex-start',
                borderRadius: '8px',
                fontSize: '13.5px',
                fontWeight: 600,
                color: isActive ? '#ffffff' : '#94a3b8',
                backgroundColor: isActive ? 'rgba(2, 132, 199, 0.2)' : 'transparent',
                borderLeft: isActive ? '3px solid #38bdf8' : '3px solid transparent',
                transition: 'all 0.15s ease',
                textDecoration: 'none',
              })}
              title={collapsed ? item.name : undefined}
            >
              <Icon size={19} style={{ flexShrink: 0 }} />
              {!collapsed && <span>{item.name}</span>}
            </NavLink>
          );
        })}
      </nav>

      {/* User Info & Logout Footer */}
      <div
        style={{
          padding: collapsed ? '16px 8px' : '16px 14px',
          borderTop: '1px solid rgba(255, 255, 255, 0.08)',
          backgroundColor: '#0a0f1d',
        }}
      >
        {!collapsed ? (
          <div>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                marginBottom: '12px',
              }}
            >
              <div
                style={{
                  width: '38px',
                  height: '38px',
                  borderRadius: '50%',
                  background: 'linear-gradient(135deg, #38bdf8 0%, #0284c7 100%)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 700,
                  fontSize: '14px',
                  color: '#ffffff',
                  flexShrink: 0,
                }}
              >
                {user?.name ? user.name.charAt(0).toUpperCase() : 'U'}
              </div>

              <div style={{ flex: 1, minWidth: 0 }}>
                <div
                  style={{
                    fontSize: '13.5px',
                    fontWeight: 700,
                    color: '#f8fafc',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}
                >
                  {user?.name || 'DocuSphere User'}
                </div>
                <div
                  style={{
                    fontSize: '11.5px',
                    color: '#94a3b8',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}
                >
                  {divisionName ? `${divisionName} Div.` : user?.email}
                </div>
              </div>
            </div>

            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '8px',
              }}
            >
              <span
                style={{
                  padding: '2px 8px',
                  borderRadius: '4px',
                  fontSize: '11px',
                  fontWeight: 700,
                  backgroundColor: badge.bg,
                  color: badge.color,
                }}
              >
                {badge.label}
              </span>

              <button
                onClick={handleLogout}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: '#ef4444',
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                  fontSize: '12px',
                  fontWeight: 600,
                  padding: '4px 6px',
                  borderRadius: '4px',
                }}
                title="Sign out of DocuSphere"
              >
                <LogOut size={14} />
                <span>Sign Out</span>
              </button>
            </div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '50%',
                background: 'linear-gradient(135deg, #38bdf8 0%, #0284c7 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 700,
                fontSize: '14px',
                color: '#ffffff',
              }}
              title={`${user?.name} (${badge.label})`}
            >
              {user?.name ? user.name.charAt(0).toUpperCase() : 'U'}
            </div>
            <button
              onClick={handleLogout}
              style={{
                background: 'transparent',
                border: 'none',
                color: '#ef4444',
                cursor: 'pointer',
                padding: '6px',
                display: 'flex',
              }}
              title="Sign Out"
            >
              <LogOut size={16} />
            </button>
          </div>
        )}
      </div>
    </aside>
  );
};

export default Sidebar;
