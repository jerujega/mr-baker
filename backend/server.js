// backend/server.js
require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const app = express();
app.use(cors(), express.json());

// 1) Connect to MongoDB
mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

// 2) Define a simple User schema
const userSchema = new mongoose.Schema({
  firstName: String,
  lastName:  String,
  email:     { type: String, unique: true },
  password:  String,
});
const User = mongoose.model('User', userSchema);

// 3) SIGNUP endpoint
app.post('/signup', async (req, res) => {
    console.log('🔥  /signup called with:', req.body);
  try {
    const { firstName, lastName, email, password } = req.body;
    const hash = await bcrypt.hash(password, 10);
    await User.create({ firstName, lastName, email, password: hash });
    return res.json({ success: true });
  } catch (err) {
    console.error('❌  signup error:', err);
    return res.status(400).json({ success: false, message: 'Signup failed' });
  }
});

// 4) LOGIN endpoint
// app.post('/login', async (req, res) => {
//   const { email, password } = req.body;
//   const user = await User.findOne({ email });
//   if (!user) return res.status(401).json({ success: false, message: 'Invalid credentials' });

//   const match = await bcrypt.compare(password, user.password);
//   if (!match) return res.status(401).json({ success: false, message: 'Invalid credentials' });

//   // issue a simple JWT (optional, for now we'll just return success)
//   const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, { expiresIn: '7d' });
//   return res.json({ success: true, token });
// });
const { OAuth2Client } = require('google-auth-library');
const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID); // Add this to your .env

app.post('/api/auth/google', async (req, res) => {
  const { token } = req.body;

  try {
    const ticket = await client.verifyIdToken({
      idToken: token,
      audience: process.env.GOOGLE_CLIENT_ID,
    });

    const payload = ticket.getPayload();
    const { email, given_name, family_name } = payload;

    // Check if user exists
    let user = await User.findOne({ email });

    // If not, create user
    if (!user) {
      user = await User.create({
        email,
        firstName: given_name,
        lastName: family_name,
        password: '', // You can leave this empty or flag this as Google account
      });
    }

    // Generate JWT
    const jwtToken = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, {
      expiresIn: '7d',
    });

    return res.json({ success: true, token: jwtToken });
  } catch (err) {
    console.error('❌ Google login failed:', err);
    return res.status(401).json({ success: false, message: 'Invalid Google token' });
  }
});


// 5) Start the server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`✅  Backend running on http://localhost:${PORT}`));
