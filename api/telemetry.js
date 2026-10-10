// Vercel Serverless Function: Balu Beats Live User & Telemetry Engine
// Enables the developer (Balu / @being_rebel__7) to track all WhatsApp group testers,
// logins, signups, and device types (Android APK vs Web) in real-time.

let memoryStore = [
  {
    id: 'bb_admin_seed',
    name: 'Balu • Praveen (Creator)',
    username: '@being_rebel__7',
    email: 'creator@balubeats.app',
    password: 'balu',
    action: 'CREATOR',
    device: '📱 Android Native APK (Balu Beats)',
    timestamp: new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }),
    appVersion: 'v3.1.0'
  }
];

export default async function handler(req, res) {
  // Enable Universal CORS for both GitHub Pages & Native APK WebView
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, DELETE');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // 1. GET: Fetch list of all registered WhatsApp group testers & logins
  if (req.method === 'GET') {
    const sorted = [...memoryStore].reverse();
    return res.status(200).json({
      status: 'success',
      totalUsers: memoryStore.length,
      apkUsers: memoryStore.filter(u => (u.device || '').toLowerCase().includes('apk') || (u.device || '').toLowerCase().includes('android native')).length,
      webUsers: memoryStore.filter(u => !(u.device || '').toLowerCase().includes('apk')).length,
      users: sorted
    });
  }

  // 2. POST: Record a new user signup, login, or guest session from WhatsApp group
  if (req.method === 'POST') {
    try {
      let body = req.body;
      if (typeof body === 'string') {
        try {
          body = JSON.parse(body);
        } catch (_) {}
      }

      if (!body || typeof body !== 'object') {
        return res.status(400).json({ error: 'Invalid JSON body' });
      }

      const record = {
        id: 'bb_usr_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
        name: (body.name || 'Anonymous Listener').trim(),
        username: (body.username || '@user').trim(),
        email: (body.email || 'N/A').trim(),
        password: body.password || '',
        action: (body.action || 'LOGIN').toUpperCase(),
        device: body.device || body.deviceType || 'Web Browser',
        screen: body.screen || body.screenResolution || '',
        ip: req.headers['x-forwarded-for'] || req.socket?.remoteAddress || 'Hidden',
        timestamp: body.timestamp || new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }),
        appVersion: body.appVersion || 'v3.1.0'
      };

      // Keep recent 300 entries in buffer
      memoryStore.push(record);
      if (memoryStore.length > 300) {
        memoryStore.shift();
      }

      return res.status(200).json({
        status: 'success',
        message: 'Telemetry logged successfully',
        record
      });
    } catch (err) {
      return res.status(500).json({ error: 'Server error: ' + err.message });
    }
  }

  // 3. DELETE: Reset buffer (developer only)
  if (req.method === 'DELETE') {
    memoryStore = [memoryStore[0]];
    return res.status(200).json({ status: 'success', message: 'Telemetry store reset' });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
