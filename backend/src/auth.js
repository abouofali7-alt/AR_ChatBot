const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');

const DATA_DIR = path.join(__dirname, '..', 'data');
const JWT_SECRET = process.env.JWT_SECRET || 'ar_chatbot_secret_key_2026_' + uuidv4();

function loadJSON(file, fallback = {}) {
  const p = path.join(DATA_DIR, file);
  try { return JSON.parse(fs.readFileSync(p, 'utf8')); } catch { return fallback; }
}
function saveJSON(file, data) {
  fs.writeFileSync(path.join(DATA_DIR, file), JSON.stringify(data, null, 2), 'utf8');
}

function getUsers() {
  return loadJSON('users.json', { users: [] });
}
function saveUsers(data) {
  saveJSON('users.json', data);
}

async function register(name, email, password, accountType = 'personal') {
  const db = getUsers();
  if (db.users.find(u => u.email === email)) {
    return { error: 'Email already registered' };
  }
  const hash = await bcrypt.hash(password, 10);
  const user = {
    id: uuidv4(),
    name,
    email,
    password: hash,
    accountType,
    createdAt: Date.now(),
    lastLogin: null,
  };
  db.users.push(user);
  saveUsers(db);
  const token = jwt.sign({ id: user.id, email: user.email, accountType }, JWT_SECRET, { expiresIn: '30d' });
  return { token, user: { id: user.id, name, email, accountType } };
}

async function login(email, password) {
  const db = getUsers();
  const user = db.users.find(u => u.email === email);
  if (!user) return { error: 'Invalid email or password' };
  const ok = await bcrypt.compare(password, user.password);
  if (!ok) return { error: 'Invalid email or password' };
  user.lastLogin = Date.now();
  saveUsers(db);
  const token = jwt.sign({ id: user.id, email: user.email, accountType: user.accountType }, JWT_SECRET, { expiresIn: '30d' });
  return { token, user: { id: user.id, name: user.name, email: user.email, accountType: user.accountType } };
}

function verifyToken(token) {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch {
    return null;
  }
}

function getUserById(id) {
  const db = getUsers();
  const u = db.users.find(u => u.id === id);
  if (!u) return null;
  return { id: u.id, name: u.name, email: u.email, accountType: u.accountType, createdAt: u.createdAt, lastLogin: u.lastLogin };
}

function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization || '';
  const token = authHeader.replace(/^Bearer\s+/i, '');

  // Try JWT first
  const decoded = verifyToken(token);
  if (decoded) {
    req.user = decoded;
    return next();
  }

  // Legacy API key fallback
  const config = loadJSON('config.json');
  if (token === config.apiKey) {
    req.user = { id: '__system__', accountType: 'admin' };
    return next();
  }

  return res.status(401).json({ error: 'Unauthorized' });
}

function requireAdmin(req, res, next) {
  if (req.user && req.user.accountType === 'admin') return next();
  return res.status(403).json({ error: 'Admin access required' });
}

module.exports = { register, login, verifyToken, getUserById, requireAuth, requireAdmin, JWT_SECRET };
