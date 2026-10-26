import express from 'express';
import path from 'node:path';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { createAssistantRouter } from './assistant';
import type { Generator } from './providers';

const projectRoot = fileURLToPath(new URL('../', import.meta.url));
export function createApplication(generator?: Generator, distDirectory = path.join(projectRoot, 'dist')) {
  if (process.env.NODE_ENV === 'production' && !existsSync(path.join(distDirectory, 'index.html'))) {
    throw new Error('Frontend build is missing. Run npm run build before starting production.');
  }
  const app = express();
  app.disable('x-powered-by');
  // Set only to the known proxy hop count/subnet for your hosting platform.
  // The default rejects client-supplied X-Forwarded-For as an identity source.
  if (process.env.TRUST_PROXY) {
    const proxy = process.env.TRUST_PROXY;
    app.set('trust proxy', /^\d+$/.test(proxy) ? Number(proxy) : proxy);
  }
  app.use((_req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Referrer-Policy', 'same-origin');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
    res.setHeader('Content-Security-Policy', "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data:; connect-src 'self'; worker-src 'self'; object-src 'none'; base-uri 'self'; frame-ancestors 'none'");
    next();
  });
  app.get('/health', (_req, res) => res.set('Cache-Control', 'no-store').json({ status: 'ok' }));
  app.use('/api/assistant', createAssistantRouter(generator));
  app.use('/api', (_req, res) => res.status(404).json({ error: 'API route not found.' }));
  app.use(express.static(distDirectory, {
    dotfiles: 'deny', index: false,
    setHeaders: (res, file) => {
      if (file.endsWith('sw.js') || file.endsWith('index.html')) res.setHeader('Cache-Control', 'no-cache');
      else if (file.includes(`${path.sep}assets${path.sep}`)) res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    },
  }));
  app.get('*', (req, res) => {
    if (req.path.includes('.') || req.path.startsWith('/assets/') || !req.accepts('html')) {
      res.status(404).send('Not found'); return;
    }
    res.set('Cache-Control', 'no-cache').sendFile(path.join(distDirectory, 'index.html'));
  });
  app.use((_error: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    res.status(500).json({ error: 'Server could not complete the request.' });
  });
  return app;
}
