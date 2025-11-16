// Configuración de API
export const API_CONFIG = {
  BASE_URL: import.meta.env.VITE_AUTH_API_URL || 'https://kzq2450gbk.execute-api.us-east-1.amazonaws.com/dev',
  INCIDENTS_URL: import.meta.env.VITE_INCIDENTS_API_URL || 'https://yq7wbvxby7.execute-api.us-east-1.amazonaws.com/dev',
  ENDPOINTS: {
    REGISTER: '/auth/register',
    LOGIN: '/auth/login',
    PROFILE: '/auth/me',
    VALIDATE: '/auth/validate',
    // Incidents
    INCIDENTS: '/incidents',
    INCIDENT_BY_ID: (id) => `/incidents/${id}`,
    ASSIGN_INCIDENT: (id) => `/incidents/${id}/assign`,
    UPDATE_STATUS: (id) => `/incidents/${id}/status`
  }
};

// Helper para hacer requests con autenticación
export const apiRequest = async (endpoint, options = {}, useIncidentsAPI = false) => {
  const token = localStorage.getItem('token');
  
  const baseUrl = useIncidentsAPI ? API_CONFIG.INCIDENTS_URL : API_CONFIG.BASE_URL;
  
  const config = {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token && { 'Authorization': `Bearer ${token}` }),
      ...options.headers
    }
  };

  const response = await fetch(`${baseUrl}${endpoint}`, config);
  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || 'Error en la petición');
  }

  return data;
};
