const { SESClient, SendEmailCommand } = require('@aws-sdk/client-ses');

const sesClient = new SESClient({ region: 'us-east-1' });

async function testEmail() {
  const params = {
    Source: 'brayan.gomero@utec.edu.pe',
    Destination: {
      ToAddresses: ['brayan.gomero@utec.edu.pe'] // Enviando a ti mismo para probar
    },
    Message: {
      Subject: {
        Data: '🧪 Test Email - AlertaUTEC',
        Charset: 'UTF-8'
      },
      Body: {
        Html: {
          Data: '<h1>✅ Test Email</h1><p>Si recibes este email, AWS SES está funcionando correctamente.</p>',
          Charset: 'UTF-8'
        },
        Text: {
          Data: 'Test Email - Si recibes este email, AWS SES está funcionando correctamente.',
          Charset: 'UTF-8'
        }
      }
    }
  };

  try {
    const command = new SendEmailCommand(params);
    const result = await sesClient.send(command);
    console.log('✅ Email enviado exitosamente!');
    console.log('MessageId:', result.MessageId);
    console.log('\n📧 Revisa tu bandeja de entrada en: brayan.gomero@utec.edu.pe');
    return result;
  } catch (error) {
    console.error('❌ Error al enviar email:', error.message);
    console.error('\nPosibles causas:');
    console.error('1. AWS Academy tiene SES bloqueado (como SMS)');
    console.error('2. El email no está verificado en SES');
    console.error('3. SES está en modo sandbox y no permite enviar sin verificación');
    throw error;
  }
}

testEmail()
  .then(() => console.log('\n✅ Prueba completada'))
  .catch(() => console.log('\n❌ Prueba fallida'));
