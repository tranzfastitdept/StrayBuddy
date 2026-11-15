// backend/server.js
const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.BACKEND_PORT || 5000;

// Enable CORS for mobile browsers and frontends
app.use(cors({ origin: true, credentials: true }));
app.use(express.json({ limit: '15mb' }));

// Paths & CSV Data Driver
const DATA_DIR = path.join(__dirname, 'data');
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

function getFilePath(table) {
  return path.join(DATA_DIR, `${table}.csv`);
}

function parseCSVLine(line) {
  const result = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      result.push(current);
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current);
  return result;
}

function formatCSVLine(values) {
  return values
    .map((val) => {
      if (val === null || val === undefined) return '';
      const str = typeof val === 'object' ? JSON.stringify(val) : String(val);
      if (str.includes(',') || str.includes('"') || str.includes('\n')) {
        return `"${str.replace(/"/g, '""')}"`;
      }
      return str;
    })
    .join(',');
}

function readCSV(table) {
  const filePath = getFilePath(table);
  if (!fs.existsSync(filePath)) return [];
  const content = fs.readFileSync(filePath, 'utf-8').trim();
  if (!content) return [];
  const lines = content.split(/\r?\n/);
  if (lines.length < 2) return [];

  const headers = parseCSVLine(lines[0]);
  const rows = [];
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    const values = parseCSVLine(line);
    const row = {};
    headers.forEach((h, idx) => {
      let val = values[idx] ?? '';
      if (val === 'true') val = true;
      else if (val === 'false') val = false;
      else if (val && (val.startsWith('{') || val.startsWith('['))) {
        try {
          val = JSON.parse(val);
        } catch {}
      }
      row[h] = val;
    });
    rows.push(row);
  }
  return rows;
}

function writeCSV(table, rows) {
  const filePath = getFilePath(table);
  if (rows.length === 0) return;
  const headers = Object.keys(rows[0]);
  const lines = [headers.join(',')];
  for (const r of rows) {
    lines.push(formatCSVLine(headers.map((h) => r[h])));
  }
  fs.writeFileSync(filePath, `${lines.join('\n')}\n`, 'utf-8');
}

function appendCSV(table, row) {
  const filePath = getFilePath(table);
  if (!fs.existsSync(filePath)) {
    writeCSV(table, [row]);
    return;
  }
  const fileContent = fs.readFileSync(filePath, 'utf-8').trim();
  const headers = parseCSVLine(fileContent.split(/\r?\n/)[0]);
  const line = formatCSVLine(headers.map((h) => row[h] ?? ''));
  fs.appendFileSync(filePath, `${line}\n`, 'utf-8');
}

// ----------------------------------------------------
// ROUTES
// ----------------------------------------------------

// 1. Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString(), server: 'StrayBuddy Standalone Backend' });
});

// 2. Auth: Sign In
app.post('/api/auth/login', (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password required' });
  }

  const users = readCSV('profiles');
  const user = users.find((u) => u.username?.toLowerCase() === username.trim().toLowerCase());
  if (!user || user.password_hash !== password) {
    return res.status(401).json({ error: 'Invalid username or password' });
  }

  const { password_hash, ...safeUser } = user;
  res.json({ success: true, user: safeUser, message: `Welcome back, ${user.name}!` });
});

// 3. Auth: Sign Up
app.post('/api/auth/signup', (req, res) => {
  const { username, name, email, password } = req.body;
  if (!username || !name || !email || !password) {
    return res.status(400).json({ error: 'All fields are required' });
  }

  const users = readCSV('profiles');
  const trimmed = username.trim().toLowerCase();
  if (users.some((u) => u.username?.toLowerCase() === trimmed)) {
    return res.status(400).json({ error: 'Username already taken' });
  }
  if (users.some((u) => u.email?.toLowerCase() === email.trim().toLowerCase())) {
    return res.status(400).json({ error: 'Email already registered' });
  }

  const newUser = {
    id: `usr_${Date.now()}_${Math.random().toString(36).substring(7)}`,
    username: trimmed,
    name: name.trim(),
    email: email.trim().toLowerCase(),
    password_hash: password,
    role: trimmed === 'superad' ? 'superadmin' : 'spotter',
    xp_points: 10,
    created_at: new Date().toISOString(),
  };

  appendCSV('profiles', newUser);
  const { password_hash, ...safeUser } = newUser;
  res.json({ success: true, user: safeUser });
});

// 4. Strays: Get and Create
app.get('/api/strays', (req, res) => {
  const strays = readCSV('strays');
  res.json(strays);
});

app.post('/api/strays', (req, res) => {
  const {
    name,
    species,
    coat_description,
    health_status,
    is_tnr,
    city,
    exact_lat,
    exact_lng,
    identifier_photo_url,
    gallery_photos,
    created_by,
  } = req.body;

  if (!species || !exact_lat || !exact_lng || !identifier_photo_url) {
    return res.status(400).json({ error: 'Missing species, location, or identifier photo' });
  }

  // Fuzz coordinates (~150m offset)
  const radiusDeg = 150 / 111320;
  const u = Math.random();
  const v = Math.random();
  const w = radiusDeg * Math.sqrt(u);
  const t = 2 * Math.PI * v;
  const public_lat = Number(exact_lat) + w * Math.cos(t);
  const public_lng = Number(exact_lng) + (w * Math.sin(t)) / Math.cos((Number(exact_lat) * Math.PI) / 180);

  const newStray = {
    id: `stray_${Date.now()}_${Math.random().toString(36).substring(7)}`,
    name: name?.trim() || (species === 'cat' ? 'Community Cat' : 'Community Dog'),
    species,
    coat_description: coat_description?.trim() || '',
    health_status: health_status || 'healthy',
    is_tnr: Boolean(is_tnr),
    city: city || 'Manila',
    exact_lat: Number(exact_lat),
    exact_lng: Number(exact_lng),
    public_lat,
    public_lng,
    identifier_photo_url,
    gallery_photos: Array.isArray(gallery_photos) ? gallery_photos.slice(0, 3) : [],
    fed_count: 0,
    last_fed_at: null,
    last_seen_at: new Date().toISOString(),
    created_at: new Date().toISOString(),
    created_by: created_by || null,
  };

  appendCSV('strays', newStray);
  res.status(201).json(newStray);
});

// 5. Care Logs & "FED" Reaction
app.post('/api/care', (req, res) => {
  const { stray_id, user_id, username, action_type, notes } = req.body;
  if (!stray_id || !action_type) {
    return res.status(400).json({ error: 'stray_id and action_type required' });
  }

  const now = new Date().toISOString();
  appendCSV('care_logs', {
    id: `log_${Date.now()}_${Math.random().toString(36).substring(7)}`,
    stray_id,
    user_id: user_id || null,
    username: username || 'Anonymous Feeder',
    action_type,
    notes: notes || 'Care logged',
    created_at: now,
  });

  if (action_type === 'fed') {
    const strays = readCSV('strays');
    const idx = strays.findIndex((s) => s.id === stray_id);
    if (idx !== -1) {
      strays[idx].fed_count = (Number(strays[idx].fed_count) || 0) + 1;
      strays[idx].last_fed_at = now;
      strays[idx].last_seen_at = now;
      writeCSV('strays', strays);
      return res.json({ success: true, stray: strays[idx], message: 'Fed reaction recorded!' });
    }
  }

  res.json({ success: true });
});

// 6. Reviews & Comments
app.get('/api/reviews', (req, res) => {
  const { stray_id } = req.query;
  const reviews = readCSV('stray_reviews');
  if (stray_id) {
    return res.json(reviews.filter((r) => r.stray_id === stray_id));
  }
  res.json(reviews);
});

app.post('/api/reviews', (req, res) => {
  const { stray_id, user_id, username, rating, comment } = req.body;
  if (!stray_id || !username || !rating || !comment) {
    return res.status(400).json({ error: 'Missing required review fields' });
  }

  const newReview = {
    id: `rev_${Date.now()}_${Math.random().toString(36).substring(7)}`,
    stray_id,
    user_id: user_id || null,
    username,
    rating: Math.min(5, Math.max(1, Number(rating))),
    comment: comment.trim(),
    created_at: new Date().toISOString(),
  };

  appendCSV('stray_reviews', newReview);
  res.status(201).json(newReview);
});

// 7. Campaigns & Announcements (Requires authentication to react per user request)
app.get('/api/campaigns', (req, res) => {
  const campaigns = readCSV('campaigns');
  res.json(campaigns);
});

app.post('/api/campaigns', (req, res) => {
  const {
    action,
    campaign_id,
    reaction_type,
    user_id,
    username,
    title,
    description,
    banner_photo_url,
    target_amount,
    is_popup,
    created_by,
  } = req.body;

  if (action === 'react') {
    // ENFORCE SIGN IN BEFORE REACTING
    if (!user_id && !username) {
      return res.status(401).json({ error: 'You must be signed in to react to charity campaigns' });
    }

    const campaigns = readCSV('campaigns');
    const idx = campaigns.findIndex((c) => c.id === campaign_id);
    if (idx !== -1) {
      if (!campaigns[idx].reactions || typeof campaigns[idx].reactions !== 'object') {
        campaigns[idx].reactions = { heart: 0, paws: 0, clap: 0 };
      }
      campaigns[idx].reactions[reaction_type] = (campaigns[idx].reactions[reaction_type] || 0) + 1;
      writeCSV('campaigns', campaigns);
      return res.json({ success: true, campaign: campaigns[idx] });
    }
    return res.status(404).json({ error: 'Campaign not found' });
  }

  // Create Campaign
  if (!title || !description) {
    return res.status(400).json({ error: 'Title and description required' });
  }

  const newCampaign = {
    id: `camp_${Date.now()}_${Math.random().toString(36).substring(7)}`,
    title,
    description,
    banner_photo_url: banner_photo_url || '',
    target_amount: target_amount || '',
    is_active: true,
    is_popup: is_popup ?? true,
    reactions: { heart: 0, paws: 0, clap: 0 },
    created_by: created_by || null,
    created_at: new Date().toISOString(),
  };

  appendCSV('campaigns', newCampaign);
  res.status(201).json(newCampaign);
});

// 8. Admin Multi-City Shard Aggregation
app.get('/api/admin/aggregate', (req, res) => {
  const strays = readCSV('strays');
  const profiles = readCSV('profiles');
  const careLogs = readCSV('care_logs');

  const CITIES = [
    'Manila', 'Makati', 'Quezon City', 'Taguig', 'Pasig',
    'Mandaluyong', 'Pasay', 'Parañaque', 'Caloocan', 'Las Piñas'
  ];

  const citySummary = CITIES.map((city) => ({
    city,
    strayCount: strays.filter((s) => s.city === city).length,
    careLogCount: careLogs.length,
    status: 'Active',
  }));

  res.json({
    totalStrays: strays.length,
    totalUsers: profiles.length,
    totalCareLogs: careLogs.length,
    cities: citySummary,
    allStrays: strays,
  });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`[BACKEND] 🚀 Standalone API Server running on http://0.0.0.0:${PORT}`);
});
