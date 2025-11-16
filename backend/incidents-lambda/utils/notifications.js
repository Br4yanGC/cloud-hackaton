const { LambdaClient, InvokeCommand } = require('@aws-sdk/client-lambda');
const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, GetCommand } = require('@aws-sdk/lib-dynamodb');
const { notifyUser } = require('./websocket');

const lambdaClient = new LambdaClient({ region: 'us-east-1' });
const dynamoClient = new DynamoDBClient({ region: 'us-east-1' });
const dynamoDB = DynamoDBDocumentClient.from(dynamoClient);

const NOTIFICATIONS_FUNCTION = 'alertautec-notifications-service-dev-createNotification';
const SMS_FUNCTION = 'alertautec-notifications-service-dev-sendSMS';
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
 * Enviar SMS de notificación
 */
async function sendSMSNotification(phoneNumber, incidentId, incidentDescription) {
  try {
    if (!phoneNumber) {
      console.log('No se proporcionó número de teléfono, omitiendo SMS');
      return null;
    }

    const payload = {
      body: JSON.stringify({
        phoneNumber,
        incidentId,
        incidentDescription
      })
    };

    const command = new InvokeCommand({
      FunctionName: SMS_FUNCTION,
      Payload: JSON.stringify(payload)
    });

    const response = await lambdaClient.send(command);
    const result = JSON.parse(new TextDecoder().decode(response.Payload));
    console.log('SMS enviado:', result);
    return result;
  } catch (error) {
    console.error('Error al enviar SMS:', error);
    // No lanzamos el error para que no falle la asignación si el SMS falla
    return null;
  }
}

/**
 * Notificar asignación de incidente
 */
async function notifyIncidentAssignment(adminId, incidentId, incidentDescription) {
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

    // Enviar SMS si tiene número de teléfono
    if (admin.phoneNumber) {
      console.log(`Enviando SMS a ${admin.phoneNumber}`);
      await sendSMSNotification(admin.phoneNumber, incidentId, incidentDescription);
    } else {
      console.log(`Admin ${admin.name} no tiene número de teléfono registrado`);
    }

    console.log(`Notificaciones enviadas exitosamente`);
  } catch (error) {
    console.error('Error al enviar notificaciones:', error);
    // No lanzamos el error para que no falle la asignación
  }
}

module.exports = {
  createInAppNotification,
  sendSMSNotification,
  notifyIncidentAssignment
};
