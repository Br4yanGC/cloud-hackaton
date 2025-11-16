const { LambdaClient, InvokeCommand } = require('@aws-sdk/client-lambda');
const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, GetCommand } = require('@aws-sdk/lib-dynamodb');
const { notifyUser } = require('./websocket');

const lambdaClient = new LambdaClient({ region: 'us-east-1' });
const dynamoClient = new DynamoDBClient({ region: 'us-east-1' });
const dynamoDB = DynamoDBDocumentClient.from(dynamoClient);

const NOTIFICATIONS_FUNCTION = 'alertautec-notifications-service-dev-createNotification';
const EMAIL_FUNCTION = 'alertautec-notifications-service-dev-sendEmail';
const USERS_TABLE = 'alertautec-auth-users-dev';

/**
 * Obtener usuario por ID desde DynamoDB
 */
async function getUserById(userId) {
  try {
    const params = {
      TableName: USERS_TABLE,
      Key: { id: userId }
    };
    const result = await dynamoDB.send(new GetCommand(params));
    return result.Item || null;
  } catch (error) {
    console.error('Error al obtener usuario:', error);
    return null;
  }
}

/**
 * Crear notificación in-app
 */
async function createInAppNotification(userId, title, message, type = 'info', metadata = {}) {
  try {
    const payload = {
      body: JSON.stringify({
        userId,
        title,
        message,
        type,
        metadata
      })
    };

    const command = new InvokeCommand({
      FunctionName: NOTIFICATIONS_FUNCTION,
      Payload: JSON.stringify(payload)
    });

    const response = await lambdaClient.send(command);
    const result = JSON.parse(new TextDecoder().decode(response.Payload));
    console.log('Notificación in-app creada:', result);
    return result;
  } catch (error) {
    console.error('Error al crear notificación in-app:', error);
    throw error;
  }
}

/**
 * Enviar notificación por Email (SNS)
 */
async function sendEmailNotification(adminEmail, adminName, incidentId, incidentDescription) {
  try {
    if (!adminEmail) {
      console.log('No se proporcionó email, omitiendo notificación por email');
      return null;
    }

    const payload = {
      body: JSON.stringify({
        email: adminEmail,
        name: adminName,
        incidentId,
        incidentDescription
      })
    };

    const command = new InvokeCommand({
      FunctionName: EMAIL_FUNCTION,
      Payload: JSON.stringify(payload)
    });

    const response = await lambdaClient.send(command);
    const result = JSON.parse(new TextDecoder().decode(response.Payload));
    console.log('✅ Email enviado:', result);
    return result;
  } catch (error) {
    console.error('Error al enviar email:', error);
    // No lanzamos el error para que no falle la asignación si el email falla
    return null;
  }
}

/**
 * Notificar asignación de incidente
 */
async function notifyIncidentAssignment(adminId, incidentId, incidentDescription, urgency) {
  try {
    // Obtener datos del admin desde DynamoDB
    const admin = await getUserById(adminId);
    
    if (!admin) {
      console.error(`Admin no encontrado: ${adminId}`);
      return;
    }

    console.log(`Enviando notificaciones a ${admin.name} (${adminId})`);

    // Crear notificación in-app
    const notification = await createInAppNotification(
      adminId,
      'Nuevo incidente asignado',
      `Se te ha asignado el incidente ${incidentId}: ${incidentDescription}`,
      'warning',
      { incidentId, action: 'assignment' }
    );

    // Enviar notificación WebSocket en tiempo real
    await notifyUser(adminId, {
      type: 'NEW_NOTIFICATION',
      notification: notification.body ? JSON.parse(notification.body) : null,
      message: `Nueva notificación: Incidente ${incidentId} asignado`
    });

    console.log(`✅ Notificación WebSocket enviada a ${admin.name}`);

    // Enviar Email solo si el incidente es CRÍTICO
    if (urgency === 'critica') {
      console.log(`⚠️ Incidente CRÍTICO detectado - Enviando email a todos los admins suscritos`);
      if (admin.email) {
        await sendEmailNotification(admin.email, admin.name, incidentId, incidentDescription);
      }
    } else {
      console.log(`ℹ️ Incidente con urgencia "${urgency}" - No se envía email (solo críticos)`);
    }

    console.log(`Notificaciones enviadas exitosamente`);
  } catch (error) {
    console.error('Error al enviar notificaciones:', error);
    // No lanzamos el error para que no falle la asignación
  }
}

module.exports = {
  createInAppNotification,
  sendEmailNotification,
  notifyIncidentAssignment
};
