const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, PutCommand, GetCommand, QueryCommand, ScanCommand, UpdateCommand, DeleteCommand } = require('@aws-sdk/lib-dynamodb');

const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client, {
  marshallOptions: {
    removeUndefinedValues: true,
    convertEmptyValues: false
  }
});

const INCIDENTS_TABLE = process.env.INCIDENTS_TABLE;

// Crear incidente
const createIncident = async (incident) => {
  await docClient.send(new PutCommand({
    TableName: INCIDENTS_TABLE,
    Item: incident
  }));
  return incident;
};

// Obtener incidente por ID
const getIncidentById = async (id) => {
  const result = await docClient.send(new GetCommand({
    TableName: INCIDENTS_TABLE,
    Key: { id }
  }));
  return result.Item;
};

// Listar todos los incidentes
const listAllIncidents = async () => {
  const result = await docClient.send(new ScanCommand({
    TableName: INCIDENTS_TABLE
  }));
  return result.Items;
};

// Listar incidentes por creador
const listIncidentsByCreator = async (createdBy) => {
  const result = await docClient.send(new QueryCommand({
    TableName: INCIDENTS_TABLE,
    IndexName: 'CreatedByIndex',
    KeyConditionExpression: 'createdBy = :createdBy',
    ExpressionAttributeValues: {
      ':createdBy': createdBy
    },
    ScanIndexForward: false // Orden descendente por fecha
  }));
  return result.Items;
};

// Listar incidentes asignados a un admin
const listIncidentsByAssignee = async (assignedTo) => {
  const result = await docClient.send(new QueryCommand({
    TableName: INCIDENTS_TABLE,
    IndexName: 'AssignedToIndex',
    KeyConditionExpression: 'assignedTo = :assignedTo',
    ExpressionAttributeValues: {
      ':assignedTo': assignedTo
    },
    ScanIndexForward: false
  }));
  return result.Items;
};

// Listar incidentes por estado
const listIncidentsByStatus = async (status) => {
  const result = await docClient.send(new QueryCommand({
    TableName: INCIDENTS_TABLE,
    IndexName: 'StatusIndex',
    KeyConditionExpression: '#status = :status',
    ExpressionAttributeNames: {
      '#status': 'status'
    },
    ExpressionAttributeValues: {
      ':status': status
    },
    ScanIndexForward: false
  }));
  return result.Items;
};

// Actualizar incidente
const updateIncident = async (id, updates) => {
  // Filtrar valores undefined/null antes de actualizar
  const cleanUpdates = Object.fromEntries(
    Object.entries(updates).filter(([_, v]) => v !== undefined && v !== null)
  );

  const updateExpression = [];
  const expressionAttributeNames = {};
  const expressionAttributeValues = {};

  Object.keys(cleanUpdates).forEach((key, index) => {
    const placeholder = `#attr${index}`;
    const valuePlaceholder = `:val${index}`;
    updateExpression.push(`${placeholder} = ${valuePlaceholder}`);
    expressionAttributeNames[placeholder] = key;
    expressionAttributeValues[valuePlaceholder] = cleanUpdates[key];
  });

  const result = await docClient.send(new UpdateCommand({
    TableName: INCIDENTS_TABLE,
    Key: { id },
    UpdateExpression: `SET ${updateExpression.join(', ')}`,
    ExpressionAttributeNames: expressionAttributeNames,
    ExpressionAttributeValues: expressionAttributeValues,
    ReturnValues: 'ALL_NEW'
  }));

  return result.Attributes;
};

// Eliminar incidente
const deleteIncident = async (id) => {
  await docClient.send(new DeleteCommand({
    TableName: INCIDENTS_TABLE,
    Key: { id }
  }));
};

module.exports = {
  createIncident,
  getIncidentById,
  listAllIncidents,
  listIncidentsByCreator,
  listIncidentsByAssignee,
  listIncidentsByStatus,
  updateIncident,
  deleteIncident
};
