import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { apiRequest, API_CONFIG } from '../config';

function Login({ onLogin }) {
  const navigate = useNavigate();
  const [credentials, setCredentials] = useState({
    email: '',
    password: ''
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      // Llamada real a la API de AWS Lambda
      const response = await apiRequest(API_CONFIG.ENDPOINTS.LOGIN, {
        method: 'POST',
        body: JSON.stringify({
          email: credentials.email,
          password: credentials.password
        })
      });

      // Guardar token en localStorage
      localStorage.setItem('token', response.token);

      // Obtener datos completos del usuario
      const profileResponse = await apiRequest(API_CONFIG.ENDPOINTS.PROFILE, {
        method: 'GET'
      });

      const user = profileResponse.user;

      onLogin({
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        code: user.code || null
      });
      
      // Redirigir según el rol
      if (user.role === 'administrador') {
        navigate('/admin/dashboard');
      } else if (user.role === 'superadmin') {
        navigate('/superadmin/dashboard');
      } else if (user.role === 'estudiante') {
        navigate('/student/dashboard');
      }
    } catch (err) {
      setError(err.message || 'Error al iniciar sesión. Verifica tus credenciales.');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-gray-900 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black opacity-50"></div>
      
      <div className="relative z-10 w-full max-w-md">
        {/* Login Card */}
        <div className="bg-white rounded-2xl shadow-2xl p-8">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="w-20 h-20 bg-utec-blue rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
            </div>
            <h2 className="text-3xl font-bold text-gray-800">AlertaUTEC</h2>
            <p className="text-gray-600 mt-2">Sistema de Gestión de Incidentes</p>
            <p className="text-sm text-gray-500 mt-1">Ingresa con tu cuenta institucional</p>
          </div>

          {/* Error Message */}
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6 flex items-center gap-2">
              <svg className="w-5 h-5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
              <span className="text-sm">{error}</span>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Correo Institucional
              </label>
              <input
                type="email"
                required
                value={credentials.email}
                onChange={(e) => setCredentials({ ...credentials, email: e.target.value })}
                placeholder="nombre@utec.edu.pe"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-utec-blue focus:border-transparent transition-all"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Contraseña
              </label>
              <input
                type="password"
                required
                value={credentials.password}
                onChange={(e) => setCredentials({ ...credentials, password: e.target.value })}
                placeholder="••••••••"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-utec-blue focus:border-transparent transition-all"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-utec-blue text-white py-3 rounded-lg hover:bg-blue-800 transition-colors font-bold text-lg disabled:bg-gray-400 disabled:cursor-not-allowed shadow-lg"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Verificando...
                </span>
              ) : (
                'Iniciar Sesión'
              )}
            </button>
          </form>

          {/* Register Link */}
          <div className="mt-6 text-center">
            <p className="text-gray-600 text-sm">
              ¿Eres estudiante y no tienes cuenta?{' '}
              <Link to="/register" className="text-utec-blue font-semibold hover:underline">
                Regístrate aquí
              </Link>
            </p>
          </div>

          {/* Demo Credentials */}
          <div className="mt-6 space-y-3">
            <div className="p-4 bg-purple-50 rounded-lg border border-purple-200">
              <p className="text-xs text-gray-600 mb-2 font-semibold">👑 Cuenta SuperAdministrador:</p>
              <p className="text-xs text-gray-700"><strong>Email:</strong> superadmin@utec.edu.pe</p>
              <p className="text-xs text-gray-700"><strong>Contraseña:</strong> superadmin123</p>
            </div>
            
            <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
              <p className="text-xs text-gray-600 mb-2 font-semibold">👨‍💼 Cuenta Administrativa:</p>
              <p className="text-xs text-gray-700"><strong>Email:</strong> admin@utec.edu.pe</p>
              <p className="text-xs text-gray-700"><strong>Contraseña:</strong> admin123</p>
            </div>
            
            <div className="p-4 bg-green-50 rounded-lg border border-green-200">
              <p className="text-xs text-gray-600 mb-2 font-semibold">👨‍🎓 Cuenta Estudiante:</p>
              <p className="text-xs text-gray-700"><strong>Email:</strong> estudiante@utec.edu.pe</p>
              <p className="text-xs text-gray-700"><strong>Contraseña:</strong> estudiante123</p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <p className="text-center text-white text-sm mt-6 opacity-75">
          Universidad de Ingeniería y Tecnología (UTEC)
        </p>
      </div>
    </div>
  );
}

export default Login;
