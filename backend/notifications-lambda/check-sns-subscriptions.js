const { SNSClient, ListSubscriptionsByTopicCommand } = require('@aws-sdk/client-sns');

const snsClient = new SNSClient({ region: 'us-east-1' });
const TOPIC_ARN = 'arn:aws:sns:us-east-1:119327998857:alertautec-notifications-topic';

async function checkSubscriptions() {
  try {
    console.log('🔍 Verificando suscripciones en SNS Topic...\n');
    console.log(`Topic: ${TOPIC_ARN}\n`);
    
    const command = new ListSubscriptionsByTopicCommand({
      TopicArn: TOPIC_ARN
    });

    const result = await snsClient.send(command);
    const subscriptions = result.Subscriptions || [];

    console.log(`📋 Total de suscripciones: ${subscriptions.length}\n`);

    if (subscriptions.length === 0) {
      console.log('⚠️ No hay suscripciones en el topic');
      return;
    }

    subscriptions.forEach((sub, index) => {
      console.log(`\n━━━ Suscripción ${index + 1} ━━━`);
      console.log(`Protocol: ${sub.Protocol}`);
      console.log(`Endpoint: ${sub.Endpoint}`);
      console.log(`SubscriptionArn: ${sub.SubscriptionArn}`);
      
      if (sub.SubscriptionArn === 'PendingConfirmation') {
        console.log(`Estado: ⏳ PENDIENTE DE CONFIRMACIÓN`);
        console.log(`⚠️ El usuario debe confirmar desde su email`);
      } else {
        console.log(`Estado: ✅ CONFIRMADO`);
        console.log(`✉️ Este email recibirá las notificaciones`);
      }
    });

    const confirmed = subscriptions.filter(s => s.SubscriptionArn !== 'PendingConfirmation').length;
    const pending = subscriptions.filter(s => s.SubscriptionArn === 'PendingConfirmation').length;

    console.log('\n\n📊 RESUMEN:');
    console.log(`✅ Confirmadas: ${confirmed}`);
    console.log(`⏳ Pendientes: ${pending}`);
    console.log(`📧 Total: ${subscriptions.length}`);

    if (pending > 0) {
      console.log('\n⚠️ ACCIÓN REQUERIDA:');
      console.log('Hay suscripciones pendientes de confirmación.');
      console.log('Revisa tu email y confirma haciendo clic en el enlace de AWS.');
    }

  } catch (error) {
    console.error('❌ Error:', error);
    throw error;
  }
}

checkSubscriptions();
