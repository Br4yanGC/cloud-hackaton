// WebSocket connection manager for real-time notifications
import { API_CONFIG } from '../config';

const WEBSOCKET_URL = API_CONFIG.WEBSOCKET_URL;

class WebSocketManager {
  constructor() {
    this.ws = null;
    this.listeners = new Map();
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    this.reconnectDelay = 3000;
  }

  connect(userId, role) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      console.log('✅ WebSocket ya conectado');
      return;
    }

    const url = `${WEBSOCKET_URL}?userId=${userId}&role=${role}`;
    console.log('🔌 Conectando WebSocket:', url);

    this.ws = new WebSocket(url);

    this.ws.onopen = () => {
      console.log('✅ WebSocket conectado');
      this.reconnectAttempts = 0;
    };

    this.ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        console.log('📩 Mensaje WebSocket recibido:', data);

        // Notificar a todos los listeners del tipo específico
        const typeListeners = this.listeners.get(data.type) || [];
        typeListeners.forEach(callback => callback(data));

        // Notificar a listeners generales
        const allListeners = this.listeners.get('*') || [];
        allListeners.forEach(callback => callback(data));
      } catch (error) {
        console.error('❌ Error al procesar mensaje WebSocket:', error);
      }
    };

    this.ws.onerror = (error) => {
      console.error('❌ Error en WebSocket:', error);
    };

    this.ws.onclose = () => {
      console.log('🔌 WebSocket desconectado');
      this.attemptReconnect(userId, role);
    };
  }

  attemptReconnect(userId, role) {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      console.log(`🔄 Reintentando conexión (${this.reconnectAttempts}/${this.maxReconnectAttempts})...`);
      
      setTimeout(() => {
        this.connect(userId, role);
      }, this.reconnectDelay);
    } else {
      console.error('❌ Máximo de reintentos alcanzado');
    }
  }

  disconnect() {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.listeners.clear();
  }

  // Subscribirse a notificaciones de un tipo específico
  on(type, callback) {
    if (!this.listeners.has(type)) {
      this.listeners.set(type, []);
    }
    this.listeners.get(type).push(callback);

    // Retornar función para desuscribirse
    return () => {
      const callbacks = this.listeners.get(type);
      const index = callbacks.indexOf(callback);
      if (index > -1) {
        callbacks.splice(index, 1);
      }
    };
  }

  // Enviar mensaje
  send(message) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message));
    } else {
      console.error('❌ WebSocket no está conectado');
    }
  }
}

// Instancia singleton
const websocketManager = new WebSocketManager();

export default websocketManager;
