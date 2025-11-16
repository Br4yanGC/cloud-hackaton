const { v4: uuidv4 } = require('uuid');
const { requireAuth } = require('../utils/auth');
const { success, error } = require('../utils/response');
const { notifyAdmins, notifyUser } = require('../utils/websocket');
const {
  createIncident,
  getIncidentById,
  listAllIncidents,
  listIncidentsByCreator,
  listIncidentsByAssignee,
  listIncidentsByStatus,
  updateIncident,
  deleteIncident
} = require('../utils/dynamodb');

// Lambda: Crear incidente
module.exports.create = async (event) => {
  try {
    // Verificar autenticación
    const auth = await requireAuth(event);
    if (!auth.authenticated) {
      return error(401, auth.error);
    }

    const body = JSON.parse(event.body);
    const { type, location, description, urgency } = body;

    // Validación
    if (!type || !location || !description || !urgency) {
      return error(400, 'Campos requeridos: type, location, description, urgency');
    }

    const validUrgencies = ['baja', 'media', 'alta'];
    if (!validUrgencies.includes(urgency)) {
      return error(400, 'Urgencia debe ser: baja, media o alta');
    }

    // Generar ID y código de seguimiento
    const id = uuidv4();
    const trackingCode = `INC-${new Date().getFullYear()}-${String(Math.floor(Math.random() * 10000)).padStart(4, '0')}`;
    
    const now = new Date().toISOString();
    
    const incident = {
      id,
      trackingCode,
      type,
      location,
      description,
      urgency,
      status: 'pendiente',
      assignedTo: 'unassigned',  // Usar string en lugar de null para el índice
      createdBy: auth.user.id,
      createdByName: auth.user.name,
      createdByEmail: auth.user.email,
      createdAt: now,
      updatedAt: now,
      history: [
        {
          action: 'Creado',
          timestamp: now,
          user: auth.user.name
        }
      ]
    };

    await createIncident(incident);

    // Notificar a los admins via WebSocket
    await notifyAdmins({
      type: 'NEW_INCIDENT',
      incident,
      message: `Nuevo incidente creado: ${incident.trackingCode} - ${incident.type}`
    });

    return success({
      message: 'Incidente creado exitosamente',
      incident
    }, 201);
  } catch (err) {
    console.error('Error al crear incidente:', err);
    return error(500, 'Error interno del servidor', err.message);
  }
};

// Lambda: Listar incidentes con filtros
module.exports.list = async (event) => {
  try {
    // Verificar autenticación
    const auth = await requireAuth(event);
    if (!auth.authenticated) {
      return error(401, auth.error);
    }

    const queryParams = event.queryStringParameters || {};
    const { createdBy, assignedTo, status: statusFilter, my } = queryParams;

    let incidents;

    // Si "my=true", listar los del usuario actual
    if (my === 'true') {
      if (auth.user.role === 'estudiante') {
        incidents = await listIncidentsByCreator(auth.user.id);
      } else if (auth.user.role === 'administrador') {
        incidents = await listIncidentsByAssignee(auth.user.id);
      } else {
        incidents = await listAllIncidents();
      }
    }
    // Filtrar por creador
    else if (createdBy) {
      incidents = await listIncidentsByCreator(createdBy);
    }
    // Filtrar por asignado
    else if (assignedTo) {
      if (assignedTo === 'me') {
        incidents = await listIncidentsByAssignee(auth.user.id);
      } else {
        incidents = await listIncidentsByAssignee(assignedTo);
      }
    }
    // Filtrar por estado
    else if (statusFilter) {
      incidents = await listIncidentsByStatus(statusFilter);
    }
    // Listar todos
    else {
      incidents = await listAllIncidents();
    }

    return success({
      incidents,
      count: incidents.length
    });
  } catch (err) {
    console.error('Error al listar incidentes:', err);
    return error(500, 'Error interno del servidor', err.message);
  }
};

// Lambda: Obtener incidente por ID
module.exports.getById = async (event) => {
  try {
    // Verificar autenticación
    const auth = await requireAuth(event);
    if (!auth.authenticated) {
      return error(401, auth.error);
    }

    const { id } = event.pathParameters;
    const incident = await getIncidentById(id);

    if (!incident) {
      return error(404, 'Incidente no encontrado');
    }

    // Verificar permisos: estudiantes solo ven sus propios incidentes
    if (auth.user.role === 'estudiante' && incident.createdBy !== auth.user.id) {
      return error(403, 'No tienes permiso para ver este incidente');
    }

    return success({ incident });
  } catch (err) {
    console.error('Error al obtener incidente:', err);
    return error(500, 'Error interno del servidor', err.message);
  }
};

// Lambda: Actualizar incidente
module.exports.update = async (event) => {
  try {
    // Verificar autenticación
    const auth = await requireAuth(event);
    if (!auth.authenticated) {
      return error(401, auth.error);
    }

    const { id } = event.pathParameters;
    const body = JSON.parse(event.body);

    const incident = await getIncidentById(id);
    if (!incident) {
      return error(404, 'Incidente no encontrado');
    }

    // Verificar permisos
    if (auth.user.role === 'estudiante' && incident.createdBy !== auth.user.id) {
      return error(403, 'No tienes permiso para actualizar este incidente');
    }

    // Campos permitidos para actualizar
    const allowedFields = ['type', 'location', 'description', 'urgency'];
    const updates = {};

    allowedFields.forEach(field => {
      if (body[field] !== undefined) {
        updates[field] = body[field];
      }
    });

    updates.updatedAt = new Date().toISOString();

    // Añadir entrada al historial
    const historyEntry = {
      action: 'Actualizado',
      timestamp: updates.updatedAt,
      user: auth.user.name,
      changes: Object.keys(updates).filter(k => k !== 'updatedAt')
    };

    updates.history = [...incident.history, historyEntry];

    const updatedIncident = await updateIncident(id, updates);

    return success({
      message: 'Incidente actualizado exitosamente',
      incident: updatedIncident
    });
  } catch (err) {
    console.error('Error al actualizar incidente:', err);
    return error(500, 'Error interno del servidor', err.message);
  }
};

// Lambda: Asignar incidente a admin
module.exports.assign = async (event) => {
  try {
    // Verificar autenticación (solo admins)
    const auth = await requireAuth(event);
    if (!auth.authenticated) {
      return error(401, auth.error);
    }

    if (auth.user.role !== 'administrador') {
      return error(403, 'Solo administradores pueden asignar incidentes');
    }

    const { id } = event.pathParameters;
    const body = JSON.parse(event.body);
    const { assignTo } = body; // 'me' o ID de otro admin

    const incident = await getIncidentById(id);
    if (!incident) {
      return error(404, 'Incidente no encontrado');
    }

    const now = new Date().toISOString();
    const assignedToId = assignTo === 'me' ? auth.user.id : assignTo;
    const assignedToName = assignTo === 'me' ? auth.user.name : body.assignedToName || 'Admin';

    console.log('Asignando incidente:', {
      assignTo,
      assignedToId,
      assignedToName,
      authUser: auth.user
    });

    const updates = {
      assignedTo: assignedToId,
      assignedToName,
      status: 'en-proceso',
      updatedAt: now,
      history: [
        ...incident.history,
        {
          action: `Asignado a ${assignedToName}`,
          timestamp: now,
          user: auth.user.name
        }
      ]
    };

    console.log('Updates a aplicar:', updates);

    const updatedIncident = await updateIncident(id, updates);

    console.log('Incidente actualizado:', updatedIncident);

    // Notificar a todos los admins sobre el cambio
    await notifyAdmins({
      type: 'INCIDENT_ASSIGNED',
      incident: updatedIncident,
      message: `Incidente ${updatedIncident.trackingCode} asignado a ${assignedToName}`
    });

    return success({
      message: 'Incidente asignado exitosamente',
      incident: updatedIncident
    });
  } catch (err) {
    console.error('Error al asignar incidente:', err);
    return error(500, 'Error interno del servidor', err.message);
  }
};

// Lambda: Cambiar estado de incidente
module.exports.updateStatus = async (event) => {
  try {
    // Verificar autenticación
    const auth = await requireAuth(event);
    if (!auth.authenticated) {
      return error(401, auth.error);
    }

    const { id } = event.pathParameters;
    const body = JSON.parse(event.body);
    const { status: newStatus } = body;

    const validStatuses = ['pendiente', 'en-proceso', 'resuelto', 'cerrado'];
    if (!validStatuses.includes(newStatus)) {
      return error(400, 'Estado inválido. Debe ser: pendiente, en-proceso, resuelto, cerrado');
    }

    const incident = await getIncidentById(id);
    if (!incident) {
      return error(404, 'Incidente no encontrado');
    }

    // Solo admins o el asignado pueden cambiar estado
    if (auth.user.role !== 'administrador' && incident.assignedTo !== auth.user.id) {
      return error(403, 'No tienes permiso para cambiar el estado de este incidente');
    }

    const now = new Date().toISOString();

    const updates = {
      status: newStatus,
      updatedAt: now,
      history: [
        ...incident.history,
        {
          action: `Estado cambiado a ${newStatus}`,
          timestamp: now,
          user: auth.user.name
        }
      ]
    };

    // Si se marca como resuelto, guardar fecha de resolución
    if (newStatus === 'resuelto' && !incident.resolvedAt) {
      updates.resolvedAt = now;
      updates.resolvedBy = auth.user.id;
      updates.resolvedByName = auth.user.name;
    }

    const updatedIncident = await updateIncident(id, updates);

    return success({
      message: 'Estado actualizado exitosamente',
      incident: updatedIncident
    });
  } catch (err) {
    console.error('Error al cambiar estado:', err);
    return error(500, 'Error interno del servidor', err.message);
  }
};

// Lambda: Eliminar incidente (solo admins)
module.exports.remove = async (event) => {
  try {
    // Verificar autenticación (solo admins)
    const auth = await requireAuth(event);
    if (!auth.authenticated) {
      return error(401, auth.error);
    }

    if (auth.user.role !== 'administrador') {
      return error(403, 'Solo administradores pueden eliminar incidentes');
    }

    const { id } = event.pathParameters;

    const incident = await getIncidentById(id);
    if (!incident) {
      return error(404, 'Incidente no encontrado');
    }

    await deleteIncident(id);

    return success({
      message: 'Incidente eliminado exitosamente',
      id
    });
  } catch (err) {
    console.error('Error al eliminar incidente:', err);
    return error(500, 'Error interno del servidor', err.message);
  }
};
