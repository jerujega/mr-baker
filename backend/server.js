require('dotenv').config();
const express  = require('express');
const mongoose = require('mongoose');
const cors     = require('cors');
const bcrypt   = require('bcryptjs');
const jwt      = require('jsonwebtoken');

const app = express();
app.use(cors());
app.use(express.json());

// 1) Connect to MongoDB
mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser:    true,
  useUnifiedTopology: true,
});

// 2) User schema
const userSchema = new mongoose.Schema({
  firstName: String,
  lastName:  String,
  email:     { type: String, unique: true },
  password:  String,
});
const User = mongoose.model('User', userSchema);

// 3) SIGNUP → now at /api/signup
app.post('/api/signup', async (req, res) => {
  console.log('🔥  POST /api/signup', req.body);
  try {
    const { firstName, lastName, email, password } = req.body;
    const hash = await bcrypt.hash(password, 10);
    await User.create({ firstName, lastName, email, password: hash });
    return res.json({ success: true });
  } catch (err) {
    console.error('❌  signup error:', err);
    // if duplicate email, send a clear message
    if (err.code === 11000) {
      return res.status(400).json({ success: false, msg: 'Email already in use' });
    }
    return res.status(400).json({ success: false, msg: 'Signup failed' });
  }
});

// 4) LOGIN → now at /api/login
app.post('/api/login', async (req, res) => {
  console.log('🔥  POST /api/login', req.body);
  const { email, password } = req.body;
  const user = await User.findOne({ email });
  if (!user) return res.status(401).json({ success: false, msg: 'Invalid credentials' });

  const match = await bcrypt.compare(password, user.password);
  if (!match) return res.status(401).json({ success: false, msg: 'Invalid credentials' });

  const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, { expiresIn: '7d' });
  return res.json({ success: true, token });
});

// 5) Start
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`✅  Backend running on http://localhost:${PORT}`));
