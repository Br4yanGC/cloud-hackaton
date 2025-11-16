// Configuración de API
export const API_CONFIG = {
  BASE_URL: import.meta.env.VITE_API_URL || 'https://9wasgnx72c.execute-api.us-east-1.amazonaws.com',
  INCIDENTS_URL: import.meta.env.VITE_INCIDENTS_API_URL || 'https://yq7wbvxby7.execute-api.us-east-1.amazonaws.com',
  WEBSOCKET_URL: import.meta.env.VITE_WEBSOCKET_URL || 'wss://d0eo5tae8b.execute-api.us-east-1.amazonaws.com/dev',
  ENDPOINTS: {
    REGISTER: '/dev/auth/register',
    LOGIN: '/dev/auth/login',
    PROFILE: '/dev/auth/me',
    VALIDATE: '/dev/auth/validate',
    // Incidents
    INCIDENTS: '/dev/incidents',
    INCIDENT_BY_ID: (id) => `/dev/incidents/${id}`,
    ASSIGN_INCIDENT: (id) => `/dev/incidents/${id}/assign`,
    UPDATE_STATUS: (id) => `/dev/incidents/${id}/status`
  }
};

// Helper para hacer requests con autenticación
export const apiRequest = async (endpoint, options = {}, useIncidentsAPI = false) => {
  const token = localStorage.getItem('token');
  const skipAuth = options.skipAuth || false;
  
  const baseUrl = useIncidentsAPI ? API_CONFIG.INCIDENTS_URL : API_CONFIG.BASE_URL;
  
  const config = {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token && !skipAuth && { 'Authorization': `Bearer ${token}` }),
      ...options.headers
    }
  };

  // Remove skipAuth from options before fetch
  delete config.skipAuth;

  const response = await fetch(`${baseUrl}${endpoint}`, config);
  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || 'Error en la petición');
  }

  return data;
};
