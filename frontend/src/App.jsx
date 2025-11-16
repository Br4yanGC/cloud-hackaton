import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import Login from './components/Login';
import AdminDashboard from './components/AdminDashboard';
import MyAssignments from './components/MyAssignments';
import MyResolved from './components/MyResolved';
import StudentDashboard from './components/StudentDashboard';
import CreateIncident from './components/CreateIncident';
import './index.css';

function App() {
  const [isAuthenticated, setIsAuthenticated] = React.useState(false);
  const [currentUser, setCurrentUser] = React.useState(null);

  // Verificar si hay sesión guardada al cargar la app
  React.useEffect(() => {
    const token = localStorage.getItem('token');
    const userStr = localStorage.getItem('user');
    
    if (token && userStr) {
      try {
        const userData = JSON.parse(userStr);
        setIsAuthenticated(true);
        setCurrentUser(userData);
        console.log('✅ Sesión restaurada desde localStorage:', userData);
      } catch (error) {
        console.error('❌ Error al restaurar sesión:', error);
        localStorage.removeItem('token');
        localStorage.removeItem('user');
      }
    }
  }, []);

  const handleLogin = (userData) => {
    setIsAuthenticated(true);
    setCurrentUser(userData);
    // Guardar usuario en localStorage
    localStorage.setItem('user', JSON.stringify(userData));
    console.log('✅ Usuario guardado en localStorage:', userData);
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    setCurrentUser(null);
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    console.log('✅ Sesión cerrada, localStorage limpiado');
  };

  // Protección de rutas según rol
  const ProtectedRoute = ({ children, allowedRole }) => {
    if (!isAuthenticated) {
      return <Navigate to="/" />;
    }
    if (allowedRole && currentUser?.role !== allowedRole) {
      return <Navigate to="/" />;
    }
    return children;
  };

  return (
    <Router>
      <Toaster 
        position="top-right"
        toastOptions={{
          duration: 4000,
          style: {
            background: '#363636',
            color: '#fff',
          },
          success: {
            duration: 3000,
            iconTheme: {
              primary: '#10b981',
              secondary: '#fff',
            },
          },
          error: {
            duration: 4000,
            iconTheme: {
              primary: '#ef4444',
              secondary: '#fff',
            },
          },
        }}
      />
      <Routes>
        {/* Login - Vista inicial */}
        <Route 
          path="/" 
          element={
            isAuthenticated ? (
              currentUser?.role === 'administrador' ? (
                <Navigate to="/admin/dashboard" />
              ) : (
                <Navigate to="/student/dashboard" />
              )
            ) : (
              <Login onLogin={handleLogin} />
            )
          } 
        />

        {/* Rutas de Admin */}
        <Route 
          path="/admin/dashboard" 
          element={
            <ProtectedRoute allowedRole="administrador">
              <AdminDashboard currentAdmin={currentUser} onLogout={handleLogout} />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/admin/my-assignments" 
          element={
            <ProtectedRoute allowedRole="administrador">
              <MyAssignments currentAdmin={currentUser} onLogout={handleLogout} />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/admin/my-resolved" 
          element={
            <ProtectedRoute allowedRole="administrador">
              <MyResolved currentAdmin={currentUser} onLogout={handleLogout} />
            </ProtectedRoute>
          } 
        />

        {/* Rutas de Estudiante */}
        <Route 
          path="/student/dashboard" 
          element={
            <ProtectedRoute allowedRole="estudiante">
              <StudentDashboard currentUser={currentUser} onLogout={handleLogout} />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/student/create-incident" 
          element={
            <ProtectedRoute allowedRole="estudiante">
              <CreateIncident currentUser={currentUser} />
            </ProtectedRoute>
          } 
        />

        {/* Ruta 404 */}
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </Router>
  );
}

export default App;
