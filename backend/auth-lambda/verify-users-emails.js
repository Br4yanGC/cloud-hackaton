const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, ScanCommand } = require('@aws-sdk/lib-dynamodb');

const client = new DynamoDBClient({ region: 'us-east-1' });
const docClient = DynamoDBDocumentClient.from(client);

const USERS_TABLE = 'alertautec-auth-users-dev';

async function verifyUsers() {
  try {
    console.log('🔍 Verificando configuración de usuarios...\n');
    
    const scanCommand = new ScanCommand({
      TableName: USERS_TABLE
    });
    
    const result = await docClient.send(scanCommand);
    const users = result.Items || [];
    
    console.log(`📋 Total de usuarios: ${users.length}\n`);
    
    users.forEach(user => {
      console.log(`👤 ${user.name}`);
      console.log(`   Email (Login): ${user.email}`);
      console.log(`   Email (Notificaciones): ${user.email_notification || '❌ NO CONFIGURADO'}`);
      console.log(`   Rol: ${user.role}`);
      console.log('');
    });
    
    const admins = users.filter(u => u.role === 'administrador' || u.role === 'superadmin');
    console.log(`\n📧 Administradores que recibirán notificaciones: ${admins.length}`);
    admins.forEach(admin => {
      console.log(`   - ${admin.name}: ${admin.email_notification || admin.email}`);
    });
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

verifyUsers();
