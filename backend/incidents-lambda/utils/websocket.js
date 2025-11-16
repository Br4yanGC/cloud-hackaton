const { LambdaClient, InvokeCommand } = require('@aws-sdk/client-lambda');

const lambdaClient = new LambdaClient({});

const WEBSOCKET_BROADCAST_FUNCTION = process.env.WEBSOCKET_BROADCAST_FUNCTION || 'alertautec-websocket-dev-broadcastNotification';

// Notificar a los admins via WebSocket
const notifyAdmins = async (message) => {
  try {
    // Notificar a administradores regulares
    const adminEvent = {
      body: JSON.stringify({
        message,
        targetRole: 'administrador'
      })
    };

    await lambdaClient.send(new InvokeCommand({
      FunctionName: WEBSOCKET_BROADCAST_FUNCTION,
      InvocationType: 'Event', // Asíncrono
      Payload: JSON.stringify(adminEvent)
    }));

    console.log('✅ Notificación enviada a admins via WebSocket');

    // Notificar a superadministradores
    const superAdminEvent = {
      body: JSON.stringify({
        message,
        targetRole: 'superadmin'
      })
    };

    await lambdaClient.send(new InvokeCommand({
      FunctionName: WEBSOCKET_BROADCAST_FUNCTION,
      InvocationType: 'Event',
      Payload: JSON.stringify(superAdminEvent)
    }));

    console.log('✅ Notificación enviada a superadmins via WebSocket');
  } catch (err) {
    console.error('❌ Error al notificar via WebSocket:', err);
    // No lanzamos error para no bloquear la creación del incidente
  }
};

// Notificar a un usuario específico
const notifyUser = async (userId, message) => {
  try {
    // El handler broadcast espera un evento con body como string JSON
    const event = {
      body: JSON.stringify({
        message,
        targetUserId: userId
      })
    };

    await lambdaClient.send(new InvokeCommand({
      FunctionName: WEBSOCKET_BROADCAST_FUNCTION,
      InvocationType: 'Event',
      Payload: JSON.stringify(event)
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
