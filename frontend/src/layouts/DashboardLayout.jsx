import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import Navbar from '../components/Navbar';

const DashboardLayout = () => {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div className="app-container">
      <Sidebar collapsed={collapsed} setCollapsed={setCollapsed} />
      <div className="main-content">
        <Navbar onToggleSidebar={() => setCollapsed(!collapsed)} />
        <main style={{ flex: 1, backgroundColor: 'var(--bg-primary)' }}>
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default DashboardLayout;
