const { LambdaClient, InvokeCommand } = require('@aws-sdk/client-lambda');

const lambdaClient = new LambdaClient({});

const WEBSOCKET_BROADCAST_FUNCTION = process.env.WEBSOCKET_BROADCAST_FUNCTION || 'alertautec-websocket-dev-broadcastNotification';

// Notificar a los admins via WebSocket
const notifyAdmins = async (message) => {
  try {
    const payload = {
      message,
      targetRole: 'administrador'
    };

    await lambdaClient.send(new InvokeCommand({
      FunctionName: WEBSOCKET_BROADCAST_FUNCTION,
      InvocationType: 'Event', // Asíncrono
      Payload: JSON.stringify(payload)
    }));

    console.log('✅ Notificación enviada a admins via WebSocket');
  } catch (err) {
    console.error('❌ Error al notificar via WebSocket:', err);
    // No lanzamos error para no bloquear la creación del incidente
  }
};

// Notificar a un usuario específico
const notifyUser = async (userId, message) => {
  try {
    const payload = {
      message,
      targetUserId: userId
    };

    await lambdaClient.send(new InvokeCommand({
      FunctionName: WEBSOCKET_BROADCAST_FUNCTION,
      InvocationType: 'Event',
      Payload: JSON.stringify(payload)
    }));

    console.log(`✅ Notificación enviada a usuario ${userId} via WebSocket`);
  } catch (err) {
    console.error('❌ Error al notificar via WebSocket:', err);
  }
};

module.exports = {
  notifyAdmins,
  notifyUser
};
