import React from 'react';

const StatCard = ({ title, value, icon: Icon, description, color = 'blue', loading = false }) => {
  const getTheme = () => {
    switch (color) {
      case 'emerald':
      case 'green':
        return {
          iconBg: '#ecfdf5',
          iconColor: '#059669',
          borderHover: '#a7f3d0',
        };
      case 'amber':
      case 'warning':
        return {
          iconBg: '#fffbeb',
          iconColor: '#d97706',
          borderHover: '#fde68a',
        };
      case 'purple':
        return {
          iconBg: '#f3e8ff',
          iconColor: '#7c3aed',
          borderHover: '#ddd6fe',
        };
      default:
        return {
          iconBg: '#e0f2fe',
          iconColor: '#0284c7',
          borderHover: '#bae6fd',
        };
    }
  };

  const theme = getTheme();

  return (
    <div
      className="ds-card ds-card-hover"
      style={{
        padding: '22px 24px',
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'space-between',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      <div>
        <div style={{ fontSize: '13px', fontWeight: 600, color: '#64748b', marginBottom: '8px' }}>
          {title}
        </div>
        <div style={{ fontSize: '28px', fontWeight: 800, color: '#0f172a', letterSpacing: '-0.03em' }}>
          {loading ? (
            <span style={{ fontSize: '20px', color: '#94a3b8' }}>...</span>
          ) : (
            value ?? 0
          )}
        </div>
        {description && (
          <div style={{ fontSize: '12px', color: '#64748b', marginTop: '6px' }}>
            {description}
          </div>
        )}
      </div>

      <div
        style={{
          width: '46px',
          height: '46px',
          borderRadius: '12px',
          backgroundColor: theme.iconBg,
          color: theme.iconColor,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
        }}
      >
        <Icon size={24} />
      </div>
    </div>
  );
};

export default StatCard;
