// Configuración de API
export const API_CONFIG = {
  BASE_URL: 'https://kzq2450gbk.execute-api.us-east-1.amazonaws.com/dev',
  ENDPOINTS: {
    REGISTER: '/auth/register',
    LOGIN: '/auth/login',
    PROFILE: '/auth/me',
    VALIDATE: '/auth/validate'
  }
};

// Helper para hacer requests con autenticación
export const apiRequest = async (endpoint, options = {}) => {
  const token = localStorage.getItem('token');
  
  const config = {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token && { 'Authorization': `Bearer ${token}` }),
      ...options.headers
    }
  };

  const response = await fetch(`${API_CONFIG.BASE_URL}${endpoint}`, config);
  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || 'Error en la petición');
  }

  return data;
};
