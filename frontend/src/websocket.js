// WebSocket Manager para notificaciones en tiempo real
class WebSocketManager {
  constructor() {
    this.ws = null;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    this.reconnectDelay = 3000;
    this.listeners = new Map();
  }

  // Conectar al WebSocket
  connect(userId, role) {
    const wsUrl = `wss://TU_WEBSOCKET_ID.execute-api.us-east-1.amazonaws.com/dev?userId=${userId}&role=${role}`;
    
    this.ws = new WebSocket(wsUrl);

    this.ws.onopen = () => {
      console.log('✅ WebSocket conectado');
      this.reconnectAttempts = 0;
      this.emit('connected');
    };

    this.ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      console.log('📩 Mensaje WebSocket:', data);
      this.emit('message', data);
      
      // Emitir eventos específicos según el tipo de mensaje
      if (data.type) {
        this.emit(data.type, data);
      }
    };

    this.ws.onerror = (error) => {
      console.error('❌ Error WebSocket:', error);
      this.emit('error', error);
    };

    this.ws.onclose = () => {
      console.log('🔌 WebSocket desconectado');
      this.emit('disconnected');
      this.attemptReconnect(userId, role);
    };
  }

  // Intentar reconectar
  attemptReconnect(userId, role) {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      console.log(`🔄 Intentando reconectar (${this.reconnectAttempts}/${this.maxReconnectAttempts})...`);
      setTimeout(() => this.connect(userId, role), this.reconnectDelay);
    } else {
      console.error('❌ Máximo de intentos de reconexión alcanzado');
      this.emit('reconnectFailed');
    }
  }

  // Enviar mensaje al servidor
  send(data) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(data));
    } else {
      console.error('❌ WebSocket no está conectado');
    }
  }

  // Suscribirse a eventos
  on(event, callback) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event).push(callback);
  }

  // Desuscribirse de eventos
  off(event, callback) {
    if (this.listeners.has(event)) {
      const callbacks = this.listeners.get(event);
      const index = callbacks.indexOf(callback);
      if (index > -1) {
        callbacks.splice(index, 1);
      }
    }
  }

  // Emitir eventos a los listeners
  emit(event, data) {
    if (this.listeners.has(event)) {
      this.listeners.get(event).forEach(callback => callback(data));
    }
  }

  // Desconectar
  disconnect() {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }
}

// Instancia singleton
export const wsManager = new WebSocketManager();

// Hook de React para usar WebSocket
export const useWebSocket = (userId, role) => {
  const [isConnected, setIsConnected] = React.useState(false);
  const [lastMessage, setLastMessage] = React.useState(null);

  React.useEffect(() => {
    if (userId && role) {
      wsManager.connect(userId, role);

      const handleConnected = () => setIsConnected(true);
      const handleDisconnected = () => setIsConnected(false);
      const handleMessage = (data) => setLastMessage(data);

      wsManager.on('connected', handleConnected);
      wsManager.on('disconnected', handleDisconnected);
      wsManager.on('message', handleMessage);

      return () => {
        wsManager.off('connected', handleConnected);
        wsManager.off('disconnected', handleDisconnected);
        wsManager.off('message', handleMessage);
        wsManager.disconnect();
      };
    }
  }, [userId, role]);

  return { isConnected, lastMessage, wsManager };
};
