import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import TopBar from './TopBar';

const AppLayout = () => {
  const [sidebarOuverte, setSidebarOuverte] = useState(false);

  return (
    <div className="flex h-screen bg-fond-principal overflow-hidden">
      <Sidebar
        ouverte={sidebarOuverte}
        onFermer={() => setSidebarOuverte(false)}
      />

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <TopBar onOuvrirSidebar={() => setSidebarOuverte(true)} />

        <main className="flex-1 overflow-y-auto p-4 lg:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default AppLayout;
