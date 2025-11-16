const { v4: uuidv4 } = require('uuid');
const {
  createNotification,
  getNotificationsByUser,
  markNotificationAsRead,
  countUnreadNotifications
} = require('../utils/dynamodb');
const { sendSMS, sendIncidentAssignmentSMS } = require('../utils/sns');

const success = (statusCode, data) => ({
  statusCode,
  headers: {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Credentials': true,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify(data)
});

const error = (statusCode, message) => ({
  statusCode,
  headers: {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Credentials': true,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({ error: message })
});

/**
 * Crear una notificación in-app
 */
module.exports.create = async (event) => {
  try {
    const { userId, title, message, type, metadata } = JSON.parse(event.body);

    if (!userId || !title || !message) {
      return error(400, 'Campos requeridos: userId, title, message');
    }

    const notification = {
      id: uuidv4(),
      userId,
      title,
      message,
      type: type || 'info', // info, success, warning, error
      metadata: metadata || {},
      read: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    await createNotification(notification);
    return success(201, notification);
  } catch (err) {
    console.error('Error al crear notificación:', err);
    return error(500, 'Error al crear notificación');
  }
};

/**
 * Listar notificaciones de un usuario
 */
module.exports.list = async (event) => {
  try {
    const { userId } = event.pathParameters;
    const limit = event.queryStringParameters?.limit || 50;

    const notifications = await getNotificationsByUser(userId, parseInt(limit));
    const unreadCount = await countUnreadNotifications(userId);

    return success(200, {
      notifications,
      unreadCount,
      total: notifications.length
    });
  } catch (err) {
    console.error('Error al listar notificaciones:', err);
    return error(500, 'Error al listar notificaciones');
  }
};

/**
 * Marcar notificación como leída
 */
module.exports.markAsRead = async (event) => {
  try {
    const { id } = event.pathParameters;

    const updatedNotification = await markNotificationAsRead(id);
    return success(200, updatedNotification);
  } catch (err) {
    console.error('Error al marcar notificación como leída:', err);
    return error(500, 'Error al marcar notificación como leída');
  }
};

/**
 * Enviar SMS
 */
module.exports.sendSMS = async (event) => {
  try {
    const { phoneNumber, message, incidentId, incidentDescription } = JSON.parse(event.body);

    if (!phoneNumber || (!message && !incidentId)) {
      return error(400, 'Campos requeridos: phoneNumber y (message o incidentId)');
    }

    let result;
    if (incidentId && incidentDescription) {
      // Enviar SMS de asignación de incidente
      result = await sendIncidentAssignmentSMS(phoneNumber, incidentId, incidentDescription);
    } else {
      // Enviar SMS genérico
      result = await sendSMS(phoneNumber, message);
    }

    return success(200, {
      success: true,
      messageId: result.MessageId,
      message: 'SMS enviado exitosamente'
    });
  } catch (err) {
    console.error('Error al enviar SMS:', err);
    return error(500, err.message || 'Error al enviar SMS');
  }
};
