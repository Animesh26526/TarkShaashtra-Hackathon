import React from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import Navbar from './Navbar';

const AppLayout = () => {
  return (
    <div className="layout-container">
      <Sidebar />
      <div className="main-content">
        <Navbar />
        <main className="page-body">
          <Outlet />
        </main>
      </div>

      <style jsx>{`
        .layout-container {
          display: flex;
          min-height: 100vh;
        }

        .main-content {
          flex: 1;
          display: flex;
          flex-direction: column;
          overflow-x: hidden;
        }

        .page-body {
          padding: 2rem;
          flex: 1;
        }
      `}</style>
    </div>
  );
};

export default AppLayout;
