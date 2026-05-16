import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
import { eq, and, desc } from 'drizzle-orm';
import { db } from './db/index.js';
import { users, complaints } from './db/schema.js';
import { sendOTPEmail } from './services/email.js';
import { getAIQuestion } from './services/ai.js';
import { authenticateToken, isAdmin } from './middleware/auth.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret';

// Middleware
app.use(cors({
  origin: [
    process.env.FRONTEND_URL || 'http://localhost:5500', 
    'http://127.0.0.1:5500',
    'https://cop-ash.github.io'
  ],
  credentials: true,
}));
app.use(express.json());
app.use(cookieParser());

// --- Auth Routes ---

// POST /api/auth/send-otp
app.post('/api/auth/send-otp', async (req, res) => {
  const { name, email } = req.body;
  if (!name || !email) return res.status(400).json({ error: 'Name and email are required' });

  try {
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const otpExpiry = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    // Check if user exists
    const existingUser = await db.query.users.findFirst({
      where: eq(users.email, email)
    });

    if (existingUser && existingUser.is_verified) {
      return res.status(400).json({ error: 'User already registered' });
    }

    if (existingUser) {
      // Update existing unverified user
      await db.update(users)
        .set({ name, otp, otp_expiry: otpExpiry })
        .where(eq(users.id, existingUser.id));
    } else {
      // Create new unverified user
      await db.insert(users).values({
        name,
        email,
        password: '', // Placeholder until register
        otp,
        otp_expiry: otpExpiry,
      });
    }

    await sendOTPEmail(email, otp);
    res.json({ message: 'OTP sent successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to send OTP' });
  }
});

// POST /api/auth/register
app.post('/api/auth/register', async (req, res) => {
  const { email, otp, password } = req.body;
  if (!email || !otp || !password) return res.status(400).json({ error: 'All fields are required' });

  try {
    const user = await db.query.users.findFirst({
      where: eq(users.email, email)
    });

    if (!user) return res.status(404).json({ error: 'User not found' });
    if (user.otp !== otp) return res.status(400).json({ error: 'Invalid OTP' });
    if (new Date() > user.otp_expiry) return res.status(400).json({ error: 'OTP expired' });

    await db.update(users)
      .set({ 
        password, 
        is_verified: true,
        otp: null,
        otp_expiry: null 
      })
      .where(eq(users.id, user.id));

    res.json({ message: 'Registration successful' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Registration failed' });
  }
});

// POST /api/auth/login
app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'Email and password are required' });

  try {
    const user = await db.query.users.findFirst({
      where: and(eq(users.email, email), eq(users.is_verified, true))
    });

    if (!user || user.password !== password) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = jwt.sign({ id: user.id, email: user.email, role: user.role }, JWT_SECRET, { expiresIn: '1d' });

    res.cookie('token', token, {
      httpOnly: false, 
      secure: true,    // Required for cross-site cookies
      sameSite: 'none', // Required for cross-site requests (GitHub Pages -> Render)
      maxAge: 24 * 60 * 60 * 1000
    });

    res.json({ name: user.name, email: user.email, role: user.role });
  } catch (error) {
    console.error('Login error details:', error);
    res.status(500).json({ 
      error: 'Login failed', 
      details: error.message,
      stack: error.stack 
    });
  }
});

// POST /api/auth/logout
app.post('/api/auth/logout', (req, res) => {
  res.clearCookie('token');
  res.json({ message: 'Logged out successfully' });
});

// GET /api/auth/me
app.get('/api/auth/me', authenticateToken, (req, res) => {
  res.json(req.user);
});

// --- AI Routes ---

// POST /api/ai/question
app.post('/api/ai/question', authenticateToken, async (req, res) => {
  const { complaint_text } = req.body;
  if (!complaint_text) return res.status(400).json({ error: 'Complaint text is required' });

  try {
    const question = await getAIQuestion(complaint_text);
    res.json({ question });
  } catch (error) {
    res.status(500).json({ error: 'AI question generation failed' });
  }
});

// --- Complaints Routes ---

// POST /api/complaints
app.post('/api/complaints', authenticateToken, async (req, res) => {
  const { complaint_text, ai_question, ai_answer } = req.body;
  
  try {
    const [complaint] = await db.insert(complaints).values({
      user_id: req.user.id,
      complaint_text,
      ai_question,
      user_answer: ai_answer,
    }).returning();

    res.json(complaint);
  } catch (error) {
    res.status(500).json({ error: 'Failed to submit complaint' });
  }
});

// GET /api/complaints/my
app.get('/api/complaints/my', authenticateToken, async (req, res) => {
  try {
    const userComplaints = await db.query.complaints.findMany({
      where: eq(complaints.user_id, req.user.id),
      orderBy: (complaints, { desc }) => [desc(complaints.created_at)]
    });
    res.json(userComplaints);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch complaints' });
  }
});

// --- Admin Routes ---

// GET /api/admin/complaints
app.get('/api/admin/complaints', authenticateToken, isAdmin, async (req, res) => {
  try {
    const allComplaints = await db.select({
      id: complaints.id,
      complaint_text: complaints.complaint_text,
      ai_question: complaints.ai_question,
      user_answer: complaints.user_answer,
      created_at: complaints.created_at,
      userName: users.name,
      userEmail: users.email,
    })
    .from(complaints)
    .innerJoin(users, eq(complaints.user_id, users.id))
    .orderBy(desc(complaints.created_at));

    res.json(allComplaints);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch all complaints' });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
