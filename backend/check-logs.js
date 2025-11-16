const { CloudWatchLogsClient, FilterLogEventsCommand, DescribeLogStreamsCommand } = require('@aws-sdk/client-cloudwatch-logs');

const client = new CloudWatchLogsClient({ region: 'us-east-1' });

async function getLogs(logGroupName, hours = 2) {
  try {
    const startTime = Date.now() - (hours * 60 * 60 * 1000);
    
    console.log(`\n📋 Logs de: ${logGroupName}`);
    console.log(`⏰ Últimas ${hours} hora(s)\n`);
    
    const command = new FilterLogEventsCommand({
      logGroupName: logGroupName,
      startTime: startTime,
      limit: 50
    });
    
    const response = await client.send(command);
    
    if (!response.events || response.events.length === 0) {
      console.log('❌ No se encontraron logs recientes\n');
      return;
    }
    
    response.events.forEach(event => {
      const timestamp = new Date(event.timestamp).toLocaleString();
      console.log(`[${timestamp}] ${event.message}`);
    });
    
    console.log(`\n✅ Total de eventos: ${response.events.length}\n`);
    
  } catch (error) {
    console.error(`❌ Error obteniendo logs de ${logGroupName}:`, error.message);
  }
}

async function main() {
  console.log('🔍 REVISANDO LOGS DE NOTIFICACIONES\n');
  console.log('='.repeat(80));
  
  // Logs de assignIncident (cuando se asigna el incidente)
  await getLogs('/aws/lambda/alertautec-incidents-dev-assignIncident', 2);
  
  console.log('='.repeat(80));
  
  // Logs de sendEmail (cuando se envía el email)
  await getLogs('/aws/lambda/alertautec-notifications-service-dev-sendEmail', 1);
  
  console.log('='.repeat(80));
  
  console.log('\n📝 Buscando mensajes clave:');
  console.log('  - "Incidente CRÍTICO detectado"');
  console.log('  - "Enviando email"');
  console.log('  - "Email enviado"');
  console.log('  - "Error"');
}

main().catch(console.error);
