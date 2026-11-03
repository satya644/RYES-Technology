require('dotenv').config();
const dns = require('dns');
try { dns.setServers(['8.8.8.8', '1.1.1.1']); } catch {}
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const seed = require('./seed-data');

const { MONGODB_URI, JWT_SECRET, ADMIN_EMAIL, ADMIN_PASSWORD_HASH, CORS_ORIGIN = '', PORT = 5000 } = process.env;
if (!MONGODB_URI || !JWT_SECRET || !ADMIN_EMAIL || !ADMIN_PASSWORD_HASH) {
  console.error('.env me MONGODB_URI, JWT_SECRET, ADMIN_EMAIL, ADMIN_PASSWORD_HASH zaroori hain');
  process.exit(1);
}

/* ================= MODELS ================= */
const S = mongoose.Schema;
const txt = (max = 200) => ({ type: String, trim: true, maxlength: max, default: '' });

const Lead = mongoose.model('Lead', new S({
  name: { type: String, required: true, trim: true, minlength: 2, maxlength: 80 },
  phone: { type: String, required: true, match: /^\d{10,15}$/ },
  businessType: txt(80),
  vertical: { type: String, enum: ['education', 'local', 'other'], default: 'other' },
  message: txt(1000),
  lang: { type: String, enum: ['en', 'hi'], default: 'hi' },
  status: { type: String, enum: ['new', 'contacted', 'pilot', 'client', 'lost'], default: 'new' },
  notes: txt(2000)
}, { timestamps: true }));

const Pricing = mongoose.model('Pricing', new S({
  vertical: { type: String, enum: ['education', 'local', 'bundle'], required: true },
  name_en: txt(80), name_hi: txt(80),
  price: { type: Number, required: true, min: 0 },
  priceFrom: { type: Boolean, default: false },
  period: { type: String, enum: ['month', 'one-time'], default: 'month' },
  popular: { type: Boolean, default: false },
  features_en: [txt(150)], features_hi: [txt(150)],
  order: { type: Number, default: 0 },
  visible: { type: Boolean, default: true }
}, { timestamps: true }));

const Portfolio = mongoose.model('Portfolio', new S({
  title_en: txt(100), title_hi: txt(100),
  category: txt(40),            // reels | website | social | other
  mediaUrl: txt(500),           // YouTube/Instagram/Drive link
  thumbUrl: txt(500),
  order: { type: Number, default: 0 },
  visible: { type: Boolean, default: true }
}, { timestamps: true }));

const Testimonial = mongoose.model('Testimonial', new S({
  name: txt(80), role: txt(80),
  text_en: txt(500), text_hi: txt(500),
  rating: { type: Number, min: 1, max: 5, default: 5 },
  order: { type: Number, default: 0 },
  visible: { type: Boolean, default: true }
}, { timestamps: true }));

const Setting = mongoose.model('Setting', new S({
  key: { type: String, default: 'site', unique: true },
  whatsapp: txt(20), email: txt(100), instagram: txt(200), youtube: txt(200),
  heroTitle_en: txt(200), heroTitle_hi: txt(200),
  heroSub_en: txt(300), heroSub_hi: txt(300)
}));

const Client = mongoose.model('Client', new S({
  name: { type: String, required: true, trim: true, minlength: 2, maxlength: 80 },
  phone: { type: String, required: true, match: /^\d{10,15}$/ },
  vertical: { type: String, enum: ['education', 'local', 'bundle', 'other'], default: 'other' },
  plan: txt(100),
  monthlyAmount: { type: Number, required: true, min: 0, default: 0 },
  startDate: { type: Date, default: Date.now },
  renewalDate: { type: Date, required: true },
  status: { type: String, enum: ['active', 'paused', 'ended'], default: 'active' },
  notes: txt(2000)
}, { timestamps: true }));

const content = { pricing: Pricing, portfolio: Portfolio, testimonials: Testimonial };
const SKIP = ['_id', '__v', 'createdAt', 'updatedAt', 'key'];
// Sirf schema me jo fields hain wahi lo (extra/ghalat fields apne aap hat jaate hain)
const pick = (Model, body = {}) => {
  const out = {};
  for (const k of Object.keys(Model.schema.paths)) if (!SKIP.includes(k) && body[k] !== undefined) out[k] = body[k];
  return out;
};

/* ================= APP ================= */
const path = require('path');
const fs = require('fs');
const multer = require('multer');

// Ensure upload directory exists
const uploadDir = path.join(__dirname, 'uploads', 'videos');
const imageUploadDir = path.join(__dirname, 'uploads', 'images');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}
if (!fs.existsSync(imageUploadDir)) {
  fs.mkdirSync(imageUploadDir, { recursive: true });
}

// Multer storage for 1GB video upload
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase() || '.mp4';
    const uniqueName = `video-${Date.now()}-${Math.round(Math.random() * 1E6)}${ext}`;
    cb(null, uniqueName);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 1024 * 1024 * 1024 }, // 1GB limit
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('video/') || /\.(mp4|webm|mov|mkv|avi|m4v)$/i.test(file.originalname)) {
      cb(null, true);
    } else {
      cb(new Error('Kripya valid video file upload karein (MP4, WebM, MOV, etc.)'));
    }
  }
});

// Multer storage for 15MB Image uploads (Stored permanently in MongoDB Atlas)
const StoredImage = mongoose.model('StoredImage', new S({
  filename: txt(200),
  contentType: { type: String, default: 'image/jpeg' },
  data: { type: Buffer, required: true },
  size: { type: Number, default: 0 }
}, { timestamps: true }));

const uploadImageMulter = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 15 * 1024 * 1024 }, // 15MB limit per image (MongoDB doc max is 16MB)
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/') || /\.(jpg|jpeg|png|webp|gif|svg|avif)$/i.test(file.originalname)) {
      cb(null, true);
    } else {
      cb(new Error('Kripya valid image file upload karein (PNG, JPG, WEBP, etc.)'));
    }
  }
});

const app = express();
app.set('trust proxy', 1);                       // Render/Railway ke peeche sahi IP ke liye
app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginResourcePolicy: { policy: "cross-origin" }
}));
const allowedOrigins = (CORS_ORIGIN || '').split(',').map(s => s.trim()).filter(Boolean);
const isAllowedOrigin = origin => {
  if (!origin) return true;
  if (allowedOrigins.includes(origin)) return true;
  if (/^http:\/\/(localhost|127\.0\.0\.1|\d+\.\d+\.\d+\.\d+)(:\d+)?$/.test(origin)) return true;
  try {
    const host = new URL(origin).hostname;
    if (host.endsWith('github.io') || host.endsWith('onrender.com') || host.endsWith('vercel.app')) return true;
  } catch {}
  return false;
};

app.use(cors({
  origin: (origin, callback) => {
    if (isAllowedOrigin(origin)) return callback(null, true);
    return callback(new Error('Not allowed by CORS: ' + origin));
  },
  credentials: true
}));
app.use(express.json({ limit: '50kb' }));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use(express.static(path.join(__dirname)));

const wrap = fn => (req, res, next) => fn(req, res, next).catch(next);
const okId = (req, res, next) => mongoose.isValidObjectId(req.params.id) ? next() : res.status(400).json({ error: 'Invalid id' });

const leadLimiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 5, message: { error: 'Bahut zyada requests, thodi der baad try karo' } });
const loginLimiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 10, message: { error: 'Bahut zyada login attempts' } });

app.get('/api/health', (req, res) => res.json({ ok: true }));

/* ---------- PUBLIC ---------- */
app.get('/api/settings', wrap(async (req, res) => res.json(await Setting.findOne({ key: 'site' }).lean() || {})));

for (const [name, Model] of Object.entries(content)) {
  app.get(`/api/${name}`, wrap(async (req, res) =>
    res.json(await Model.find({ visible: { $ne: false } }).sort('order').lean())));
}

app.post('/api/leads', leadLimiter, wrap(async (req, res) => {
  if (req.body.website) return res.json({ ok: true });        // honeypot: bots ke liye chupa field
  const data = pick(Lead, req.body);
  delete data.status; delete data.notes;                       // public ye set nahi kar sakta
  if (data.phone) data.phone = String(data.phone).replace(/\D/g, '');
  await Lead.create(data);
  res.status(201).json({ ok: true });
}));

// Public Review / Rating Submission (Requires Admin Approval before showing)
app.post('/api/testimonials', leadLimiter, wrap(async (req, res) => {
  if (req.body.website) return res.json({ ok: true });        // honeypot
  const { name, role = '', rating = 5, text = '', lang = 'hi' } = req.body || {};
  if (!name || !name.trim()) return res.status(400).json({ error: 'Kripya apna naam likhein' });
  const reviewText = String(text || '').trim();
  if (!reviewText) return res.status(400).json({ error: 'Kripya review feedback text likhein' });

  const numRating = Math.min(5, Math.max(1, Number(rating) || 5));

  const doc = await Testimonial.create({
    name: name.trim().slice(0, 80),
    role: String(role || '').trim().slice(0, 80),
    text_hi: lang === 'hi' ? reviewText.slice(0, 500) : reviewText.slice(0, 500),
    text_en: lang === 'en' ? reviewText.slice(0, 500) : reviewText.slice(0, 500),
    rating: numRating,
    order: 99,
    visible: false // Admin ke approve karne ke baad hi show hoga
  });

  res.status(201).json({
    ok: true,
    message: 'Shukriya! Aapka review submit ho gaya hai. Admin dwara verify hone ke baad yeh website par show hoga.'
  });
}));

/* ---------- AUTH ---------- */
app.post('/api/auth/login', loginLimiter, wrap(async (req, res) => {
  const { email, password } = req.body || {};
  const good = typeof email === 'string' && typeof password === 'string'
    && email.trim().toLowerCase() === ADMIN_EMAIL.toLowerCase()
    && await bcrypt.compare(password, ADMIN_PASSWORD_HASH);
  if (!good) return res.status(401).json({ error: 'Email ya password galat hai' });
  res.json({ token: jwt.sign({ role: 'admin', email: ADMIN_EMAIL }, JWT_SECRET, { expiresIn: '12h' }) });
}));

const requireAdmin = (req, res, next) => {
  const t = (req.headers.authorization || '').replace('Bearer ', '');
  try { jwt.verify(t, JWT_SECRET); next(); }
  catch { res.status(401).json({ error: 'Login zaroori hai' }); }
};
app.use('/api/admin', requireAdmin);

/* ---------- VIDEO UPLOAD (UP TO 1GB) ---------- */
app.post('/api/admin/upload', upload.single('video'), wrap(async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'Koi video file nahi mili' });
  const mediaUrl = `/uploads/videos/${req.file.filename}`;
  res.json({
    ok: true,
    mediaUrl,
    filename: req.file.filename,
    originalName: req.file.originalname,
    size: req.file.size
  });
}));

/* ---------- IMAGE UPLOAD (STORED PERMANENTLY IN MONGODB ATLAS) ---------- */
app.post('/api/admin/upload-image', uploadImageMulter.single('image'), wrap(async (req, res) => {
  if (!req.file || !req.file.buffer) return res.status(400).json({ error: 'Koi image file nahi mili' });
  const doc = await StoredImage.create({
    filename: req.file.originalname || 'image.jpg',
    contentType: req.file.mimetype || 'image/jpeg',
    data: req.file.buffer,
    size: req.file.size || req.file.buffer.length
  });
  res.json({
    ok: true,
    imageUrl: `/api/images/${doc._id}`,
    id: doc._id,
    size: doc.size
  });
}));

/* ---------- SERVE PERMANENT IMAGES DIRECTLY FROM MONGODB ATLAS ---------- */
app.get('/api/images/:id', wrap(async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) return res.status(404).send('Image not found');
  const img = await StoredImage.findById(req.params.id).lean();
  if (!img || !img.data) return res.status(404).send('Image not found');
  res.set('Content-Type', img.contentType || 'image/jpeg');
  res.set('Cache-Control', 'public, max-age=31536000, immutable');
  res.send(Buffer.isBuffer(img.data) ? img.data : Buffer.from(img.data.buffer || img.data));
}));

/* ---------- ADMIN ---------- */
app.get('/api/admin/leads', wrap(async (req, res) => res.json(await Lead.find().sort('-createdAt').lean())));

app.post('/api/admin/leads', wrap(async (req, res) => {
  const data = pick(Lead, req.body);
  if (data.phone) data.phone = String(data.phone).replace(/\D/g, '');
  const doc = await Lead.create(data);
  res.status(201).json(doc);
}));

app.patch('/api/admin/leads/:id', okId, wrap(async (req, res) => {
  const upd = {};
  if (req.body.status !== undefined) upd.status = req.body.status;
  if (req.body.notes !== undefined) upd.notes = req.body.notes;
  const doc = await Lead.findByIdAndUpdate(req.params.id, upd, { new: true, runValidators: true });
  doc ? res.json(doc) : res.status(404).json({ error: 'Not found' });
}));

app.delete('/api/admin/leads/:id', okId, wrap(async (req, res) => {
  await Lead.findByIdAndDelete(req.params.id);
  res.json({ ok: true });
}));

/* ---------- CLIENTS ---------- */
app.get('/api/admin/clients', wrap(async (req, res) => res.json(await Client.find().sort('-createdAt').lean())));

app.post('/api/admin/clients', wrap(async (req, res) => {
  const data = pick(Client, req.body);
  if (data.phone) data.phone = String(data.phone).replace(/\D/g, '');
  const doc = await Client.create(data);
  res.status(201).json(doc);
}));

app.put('/api/admin/clients/:id', okId, wrap(async (req, res) => {
  const data = pick(Client, req.body);
  if (data.phone) data.phone = String(data.phone).replace(/\D/g, '');
  const doc = await Client.findByIdAndUpdate(req.params.id, data, { new: true, runValidators: true });
  doc ? res.json(doc) : res.status(404).json({ error: 'Not found' });
}));

app.delete('/api/admin/clients/:id', okId, wrap(async (req, res) => {
  await Client.findByIdAndDelete(req.params.id);
  res.json({ ok: true });
}));

app.put('/api/admin/settings', wrap(async (req, res) => {
  res.json(await Setting.findOneAndUpdate({ key: 'site' }, pick(Setting, req.body),
    { new: true, upsert: true, runValidators: true, setDefaultsOnInsert: true }));
}));

app.post('/api/admin/seed', wrap(async (req, res) => {
  if (await Pricing.countDocuments()) return res.status(409).json({ error: 'Data pehle se hai, seed nahi chala' });
  await Setting.findOneAndUpdate({ key: 'site' }, seed.settings, { upsert: true, setDefaultsOnInsert: true });
  await Pricing.insertMany(seed.pricing.map((p, i) => ({ ...p, order: i + 1, visible: true })));
  res.json({ ok: true });
}));

// pricing / portfolio / testimonials ke liye common CRUD
app.use('/api/admin/:col', (req, res, next) => content[req.params.col] ? next() : res.status(404).json({ error: 'Unknown collection' }));
const M = req => content[req.params.col];

app.get('/api/admin/:col', wrap(async (req, res) => res.json(await M(req).find().sort('order').lean())));
app.post('/api/admin/:col', wrap(async (req, res) => res.status(201).json(await M(req).create(pick(M(req), req.body)))));
app.put('/api/admin/:col/:id', okId, wrap(async (req, res) => {
  const doc = await M(req).findByIdAndUpdate(req.params.id, pick(M(req), req.body), { new: true, runValidators: true });
  doc ? res.json(doc) : res.status(404).json({ error: 'Not found' });
}));
app.delete('/api/admin/:col/:id', okId, wrap(async (req, res) => {
  await M(req).findByIdAndDelete(req.params.id);
  res.json({ ok: true });
}));

/* ---------- ERRORS ---------- */
app.use((err, req, res, next) => {
  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(400).json({ error: 'Video file ka size 1GB se zyada hai (Max: 1GB)' });
  }
  if (err.name === 'ValidationError' || err.name === 'CastError') return res.status(400).json({ error: err.message });
  console.error(err);
  res.status(500).json({ error: err.message || 'Server error' });
});

mongoose.connect(MONGODB_URI)
  .then(() => {
    const server = app.listen(PORT, '0.0.0.0', () => console.log(`API chal raha hai: port ${PORT} (Network: http://0.0.0.0:${PORT})`));
    server.timeout = 0; // Disable socket timeout for large 1GB video uploads
    server.keepAliveTimeout = 65000;
  })
  .catch(e => { console.error('MongoDB connect nahi hua:', e.message); process.exit(1); });
