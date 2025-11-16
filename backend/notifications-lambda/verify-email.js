const { SESClient, VerifyEmailIdentityCommand } = require('@aws-sdk/client-ses');

const sesClient = new SESClient({ region: 'us-east-1' });

async function verifyEmail(email) {
  try {
    const command = new VerifyEmailIdentityCommand({
      EmailAddress: email
    });
    
    const result = await sesClient.send(command);
    console.log('✅ Email verification request sent!');
    console.log(`📧 Check the inbox of ${email} for a verification email from AWS.`);
    console.log('Click the verification link in that email to complete the process.');
    return result;
  } catch (error) {
    console.error('❌ Error verifying email:', error.message);
    throw error;
  }
}

// Email to verify
const EMAIL = 'brayan.gomero@utec.edu.pe';

verifyEmail(EMAIL)
  .then(() => {
    console.log('\n🎉 Verification email sent successfully!');
    console.log(`\nNext steps:`);
    console.log(`1. Check your email: ${EMAIL}`);
    console.log(`2. Look for an email from "Amazon Web Services"`);
    console.log(`3. Click the verification link in the email`);
    console.log(`4. Once verified, you can send emails from this address`);
  })
  .catch((error) => {
    console.error('\n❌ Failed to send verification email');
    console.error('Error:', error.message);
  });
