const { LambdaClient, InvokeCommand } = require('@aws-sdk/client-lambda');

const lambdaClient = new LambdaClient({ region: 'us-east-1' });
const EMAIL_FUNCTION = 'alertautec-notifications-service-dev-sendEmail';

async function testCriticalEmail() {
  try {
    console.log('📧 Enviando email de prueba al SNS Topic...\n');
    
    const payload = {
      body: JSON.stringify({
        subject: '🧪 PRUEBA - Incidente Crítico',
        message: `
PRUEBA DE ALERTA DE INCIDENTE CRÍTICO - AlertaUTEC
═══════════════════════════════════════

⚠️ Este es un email de prueba para verificar el sistema de notificaciones.

📋 Código de Seguimiento: TEST-001
📂 Tipo: Robo
📍 Ubicación: Biblioteca Central
📝 Descripción: Prueba del sistema de notificaciones por email

Si recibes este email, el sistema está funcionando correctamente.

═══════════════════════════════════════
Este es un correo automático de AlertaUTEC
Universidad de Ingeniería y Tecnología
        `.trim()
      })
    };

    console.log('Invocando Lambda:', EMAIL_FUNCTION);
    console.log('Payload:', JSON.stringify(payload, null, 2));
    
    const command = new InvokeCommand({
      FunctionName: EMAIL_FUNCTION,
      Payload: JSON.stringify(payload)
    });

    const response = await lambdaClient.send(command);
    const result = JSON.parse(new TextDecoder().decode(response.Payload));
    
    console.log('\n✅ Respuesta de Lambda:');
    console.log(JSON.stringify(result, null, 2));
    
    if (result.statusCode === 200) {
      console.log('\n🎉 Email enviado exitosamente!');
      console.log('📧 Revisa tu bandeja: brayan.gomero@utec.edu.pe');
    } else {
      console.log('\n❌ Error al enviar email:', result);
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
    throw error;
  }
}

testCriticalEmail();
