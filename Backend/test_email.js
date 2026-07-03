import { sendOTPEmail } from './src/services/email.js';

async function test() {
  try {
    console.log('Attempting to send test OTP email...');
    await sendOTPEmail('vicky.nick1991@gmail.com', '123456');
    console.log('Test OTP email sent successfully!');
  } catch (error) {
    console.error('Error in test:', error);
  }
}

test();
