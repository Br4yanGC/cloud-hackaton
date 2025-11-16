const { CloudWatchLogsClient, FilterLogEventsCommand } = require('@aws-sdk/client-cloudwatch-logs');

const client = new CloudWatchLogsClient({ region: 'us-east-1' });

async function getUnsubscribeLogs() {
  try {
    const logGroupName = '/aws/lambda/alertautec-notifications-service-dev-unsubscribeEmail';
    const startTime = Date.now() - (2 * 60 * 60 * 1000); // Últimas 2 horas
    
    console.log('🔍 Logs de desuscripción de emails\n');
    console.log('═'.repeat(70));
    
    const command = new FilterLogEventsCommand({
      logGroupName: logGroupName,
      startTime: startTime,
      limit: 100
    });
    
    const response = await client.send(command);
    
    if (!response.events || response.events.length === 0) {
      console.log('\n❌ No se encontraron logs de desuscripción recientes\n');
      return;
    }
    
    console.log(`\n📋 Total de eventos: ${response.events.length}\n`);
    
    response.events.forEach(event => {
      const timestamp = new Date(event.timestamp).toLocaleString();
      console.log(`[${timestamp}]`);
      console.log(event.message);
      console.log('-'.repeat(70));
    });
    
  } catch (error) {
    console.error('❌ Error al obtener logs:', error.message);
  }
}

getUnsubscribeLogs();
