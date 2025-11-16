const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, ScanCommand, UpdateCommand } = require('@aws-sdk/lib-dynamodb');

const client = new DynamoDBClient({ region: 'us-east-1' });
const docClient = DynamoDBDocumentClient.from(client);

const USERS_TABLE = 'alertautec-auth-users-dev';
const NOTIFICATION_EMAIL = 'brayan.gomero@utec.edu.pe';

async function updateAllUsersNotificationEmail() {
  try {
    console.log('🔍 Buscando todos los usuarios...');
    
    // Escanear todos los usuarios
    const scanCommand = new ScanCommand({
      TableName: USERS_TABLE
    });
    
    const result = await docClient.send(scanCommand);
    const users = result.Items || [];
    
    console.log(`📋 Encontrados ${users.length} usuarios\n`);
    
    // Actualizar cada usuario
    for (const user of users) {
      console.log(`Actualizando: ${user.name} (${user.email})`);
      
      const updateCommand = new UpdateCommand({
        TableName: USERS_TABLE,
        Key: { id: user.id },
        UpdateExpression: 'SET email_notification = :emailNotif, updatedAt = :now',
        ExpressionAttributeValues: {
          ':emailNotif': NOTIFICATION_EMAIL,
          ':now': new Date().toISOString()
        }
      });
      
      await docClient.send(updateCommand);
      console.log(`  ✅ email_notification configurado como: ${NOTIFICATION_EMAIL}`);
    }
    
    console.log('\n✨ Todos los usuarios han sido actualizados exitosamente!');
    console.log(`📧 Email de notificación: ${NOTIFICATION_EMAIL}`);
    
  } catch (error) {
    console.error('❌ Error al actualizar usuarios:', error);
    throw error;
  }
}

// Ejecutar
updateAllUsersNotificationEmail()
  .then(() => {
    console.log('\n✅ Script completado');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Error:', error);
    process.exit(1);
  });
