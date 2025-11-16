import React from 'react';
import { useNavigate } from 'react-router-dom';
import NotificationsPanel from './NotificationsPanel';

function SuperAdminLayout({ currentAdmin, onLogout, children }) {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-md border-b border-gray-200">
        <div className="container mx-auto px-4 py-4">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-utec-blue">Panel Administrativo - AlertaUTEC</h1>
              <p className="text-sm text-gray-600">Bienvenido, {currentAdmin.name}</p>
            </div>
            <div className="flex items-center gap-4">
              {/* Panel de notificaciones */}
              <NotificationsPanel />
              
              <button
                onClick={() => {
                  onLogout();
                  navigate('/');
                }}
                className="flex items-center gap-2 px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
                Cerrar Sesión
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Navigation - Solo "Todos los Incidentes" */}
      <div className="bg-white border-b border-gray-200">
        <div className="container mx-auto px-4">
          <nav className="flex space-x-8">
            <div className="flex items-center gap-2 py-4 px-2 border-b-2 border-utec-blue text-utec-blue font-medium text-sm">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
              </svg>
              Todos los Incidentes
            </div>
          </nav>
        </div>
      </div>

      {/* Content */}
      <main>
        {children}
      </main>
    </div>
  );
}

export default SuperAdminLayout;
