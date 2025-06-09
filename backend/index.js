// index.js
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const app = express();
app.use(cors());
app.use(express.json());

// 1) Connect to MongoDB (local)
mongoose.connect('mongodb://localhost:27017/mrbaker', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
}).then(() => console.log('MongoDB Connected'))
  .catch(err => console.error(err));

  
// 2) User model
const UserSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  passwordHash: String,
  firstName: String,
  lastName: String,
});
const User = mongoose.model('User', UserSchema);

const JWT_SECRET = 'REPLACE_WITH_A_SECURE_RANDOM_STRING';

// 3) Signup route
app.post('/api/signup', async (req, res) => {
  const { email, password, firstName, lastName } = req.body;
  if (!email || !password) return res.status(400).json({ msg: 'Missing fields' });
  const exists = await User.findOne({ email });
  if (exists) return res.status(400).json({ msg: 'Email already in use' });
  const passwordHash = await bcrypt.hash(password, 10);
  await new User({ email, passwordHash, firstName, lastName }).save();
  res.json({ msg: 'Signup successful' });
});

// 4) Login route
app.post('/api/login', async (req, res) => {
  const { email, password } = req.body;
  const user = await User.findOne({ email });
  if (!user) return res.status(400).json({ msg: 'Invalid credentials' });
  const match = await bcrypt.compare(password, user.passwordHash);
  if (!match) return res.status(400).json({ msg: 'Invalid credentials' });
  const token = jwt.sign({ userId: user._id }, JWT_SECRET, { expiresIn: '7d' });
  res.json({ token, email: user.email, firstName: user.firstName });
});

// 5) (Optional) Protected “me” route
app.get('/api/me', async (req, res) => {
  const auth = req.headers.authorization;
  if (!auth) return res.status(401).json({ msg: 'No token' });
  const token = auth.split(' ')[1];
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    const me = await User.findById(payload.userId).select('-passwordHash');
    res.json(me);
  } catch {
    res.status(401).json({ msg: 'Invalid token' });
  }
});

// 6) Start server
const PORT = 5000;
app.listen(PORT, () => console.log(`Server listening on port ${PORT}`));
