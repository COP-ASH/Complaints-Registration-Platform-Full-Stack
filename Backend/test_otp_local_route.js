import { db } from './src/db/index.js';
import { users } from './src/db/schema.js';
import { eq } from 'drizzle-orm';
import { sendOTPEmail } from './src/services/email.js';

async function testLocalRoute() {
  const name = 'Shivanshi Local Test';
  const email = 'vicky.nick1997@gmail.com';

  try {
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const otpExpiry = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    console.log('Checking if user exists...');
    const existingUser = await db.query.users.findFirst({
      where: eq(users.email, email)
    });

    if (existingUser && existingUser.is_verified) {
      console.log('User already registered and verified!');
      process.exit(0);
    }

    if (existingUser) {
      console.log('Updating existing unverified user with new OTP...');
      await db.update(users)
        .set({ name, otp, otp_expiry: otpExpiry })
        .where(eq(users.id, existingUser.id));
    } else {
      console.log('Inserting new unverified user...');
      await db.insert(users).values({
        name,
        email,
        password: '',
        otp,
        otp_expiry: otpExpiry,
      });
    }

    console.log(`Attempting to send OTP email to ${email}...`);
    await sendOTPEmail(email, otp);
    console.log('OTP flow succeeded completely!');
    process.exit(0);
  } catch (error) {
    console.error('Error in local OTP route simulation:', error);
    process.exit(1);
  }
}

testLocalRoute();
