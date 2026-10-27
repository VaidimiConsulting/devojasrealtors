import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import Navbar from './Navbar';

const Layout = () => {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div className="min-h-screen print:min-h-0 print:bg-white" style={{ background: 'linear-gradient(135deg, #f0f4ff 0%, #f8fafc 50%, #eef2ff 100%)' }}>
      <div className="print:hidden">
        <Sidebar collapsed={collapsed} />
      </div>
      <div className={`transition-all duration-300 print:ml-0 print:m-0 print:p-0 ${collapsed ? 'ml-[72px]' : 'ml-[280px]'}`}>
        <div className="print:hidden">
          <Navbar onToggleSidebar={() => setCollapsed(!collapsed)} />
        </div>
        <main className="p-5 sm:p-7 min-h-[calc(100vh-64px)] print:p-0 print:m-0 print:min-h-0">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default Layout;
