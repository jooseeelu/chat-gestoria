/**
 * Servicio interno de notificaciones Web Push (solo accesible dentro de la red de Docker).
 *
 * - Genera las claves VAPID la primera vez y las guarda en /data (volumen persistente).
 * - GET  /vapid-public-key -> clave pública para que el navegador se suscriba.
 * - POST /send { payload, subscriptions: [{ id, endpoint, keys }] }
 *   Responde al momento (202) y envía en segundo plano para no frenar el envío del mensaje.
 *   Las suscripciones caducadas (404/410) se devuelven en "expired" en la siguiente llamada
 *   para que PocketBase las borre.
 */
const http = require('http');
const fs = require('fs');
const path = require('path');
const webpush = require('web-push');

const DATA_DIR = process.env.DATA_DIR || '/data';
const KEY_FILE = path.join(DATA_DIR, 'vapid.json');
const PORT = Number(process.env.PORT || 3000);

function loadOrCreateKeys() {
  try {
    return JSON.parse(fs.readFileSync(KEY_FILE, 'utf8'));
  } catch (_) {
    const keys = webpush.generateVAPIDKeys();
    fs.mkdirSync(DATA_DIR, { recursive: true });
    fs.writeFileSync(KEY_FILE, JSON.stringify(keys), { mode: 0o600 });
    console.log('[push] Claves VAPID nuevas generadas');
    return keys;
  }
}

const keys = loadOrCreateKeys();
webpush.setVapidDetails(
  process.env.VAPID_SUBJECT || 'mailto:emadridgestoria@gmail.com',
  keys.publicKey,
  keys.privateKey
);

const expired = new Set();

function readJson(req) {
  return new Promise((resolve, reject) => {
    let size = 0;
    const chunks = [];
    req.on('data', (chunk) => {
      size += chunk.length;
      if (size > 1024 * 1024) {
        reject(new Error('Body demasiado grande'));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on('end', () => {
      try {
        resolve(JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}'));
      } catch (err) {
        reject(err);
      }
    });
    req.on('error', reject);
  });
}

function send(subscriptions, payload) {
  const body = JSON.stringify(payload);
  for (const sub of subscriptions) {
    webpush
      .sendNotification({ endpoint: sub.endpoint, keys: sub.keys }, body, { TTL: 86400, urgency: 'high' })
      .catch((err) => {
        if (err.statusCode === 404 || err.statusCode === 410) {
          expired.add(sub.id);
        } else {
          console.error('[push] Error enviando a', sub.endpoint.slice(0, 60), err.statusCode || err.message);
        }
      });
  }
}

const server = http.createServer(async (req, res) => {
  if (req.method === 'GET' && req.url === '/vapid-public-key') {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end(keys.publicKey);
    return;
  }

  if (req.method === 'GET' && req.url === '/health') {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('ok');
    return;
  }

  if (req.method === 'POST' && req.url === '/send') {
    let data;
    try {
      data = await readJson(req);
    } catch (_) {
      res.writeHead(400);
      res.end();
      return;
    }

    const toDelete = [...expired];
    expired.clear();
    res.writeHead(202, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ expired: toDelete }));

    if (Array.isArray(data.subscriptions) && data.payload) {
      send(data.subscriptions, data.payload);
    }
    return;
  }

  res.writeHead(404);
  res.end();
});

server.listen(PORT, () => console.log(`[push] Escuchando en :${PORT}`));
