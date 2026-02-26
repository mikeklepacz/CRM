#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const SERVER_DIR = path.join(ROOT, 'server');
const ROUTES_FILE = path.join(SERVER_DIR, 'routes.ts');
const ROUTES_DIR = path.join(SERVER_DIR, 'routes');

function walk(dir) {
  const out = [];
  const items = fs.readdirSync(dir, { withFileTypes: true });
  for (const item of items) {
    const full = path.join(dir, item.name);
    if (item.isDirectory()) out.push(...walk(full));
    if (item.isFile() && item.name.endsWith('.ts')) out.push(full);
  }
  return out;
}

function normalizeGuard(token) {
  return token
    .replace(/\s+/g, '')
    .replace(/^deps\./, '')
    .replace(/^this\./, '')
    .replace(/^\(+/, '')
    .replace(/\)+$/, '');
}

function domainOf(routePath) {
  const parts = routePath.split('/').filter(Boolean);
  if (parts.length < 2) return 'misc';
  if (parts[0] !== 'api') return parts[0];
  const d = parts[1] || 'misc';
  if (d === 'super-admin' || d === 'org-admin') return d;
  return d;
}

function parseRoutes(filePath) {
  const src = fs.readFileSync(filePath, 'utf8');
  const routes = [];

  const routeStartRe = /\bapp\.(get|post|put|patch|delete|options|head)\s*\(\s*(["'`])([^"'`]+)\2\s*,/g;
  let m;
  while ((m = routeStartRe.exec(src)) !== null) {
    const method = m[1].toUpperCase();
    const routePath = m[3];
    const line = src.slice(0, m.index).split(/\r?\n/).length;

    const afterStart = src.slice(routeStartRe.lastIndex, routeStartRe.lastIndex + 2500);
    const middlewarePart = afterStart.split(/\basync\s*\(|\(\s*req\s*[:),]/)[0] || '';
    const middlewareTokens = middlewarePart
      .split(',')
      .map((t) => normalizeGuard(t))
      .filter(Boolean)
      .filter((t) => t !== 'req' && t !== 'res' && t !== 'next');

    routes.push({
      file: path.relative(ROOT, filePath),
      line,
      method,
      path: routePath,
      domain: domainOf(routePath),
      middlewares: middlewareTokens,
    });
  }

  return routes;
}

const files = [ROUTES_FILE, ...walk(ROUTES_DIR)];
const allRoutes = files.flatMap(parseRoutes);

const authGuards = new Set([
  'isAuthenticated',
  'isAuthenticatedCustom',
  'requireSuperAdmin',
  'requireOrgAdmin',
  'isAdmin',
]);

const publicAllowlist = new Set([
  '/api/gmail/push',
  '/api/webhooks/google-calendar',
  '/api/webhooks/google-calendar/watch-status',
  '/api/webhooks/google-calendar/renew',
  '/api/elevenlabs/webhook',
  '/api/elevenlabs/webhook-status',
  '/api/twilio/voice-webhook',
  '/api/twilio/status-callback',
  '/api/twilio/incoming-call',
]);

const byDomain = {};
for (const route of allRoutes) {
  byDomain[route.domain] = byDomain[route.domain] || { total: 0, methods: {}, files: new Set() };
  byDomain[route.domain].total += 1;
  byDomain[route.domain].methods[route.method] = (byDomain[route.domain].methods[route.method] || 0) + 1;
  byDomain[route.domain].files.add(route.file);
}

const missingAuth = allRoutes
  .filter((r) => r.path.startsWith('/api/'))
  .filter((r) => !publicAllowlist.has(r.path))
  .filter((r) => !r.middlewares.some((mw) => authGuards.has(mw)))
  .map((r) => ({
    method: r.method,
    path: r.path,
    file: r.file,
    line: r.line,
    middlewares: r.middlewares,
  }));

const normalizedDomain = Object.entries(byDomain)
  .map(([domain, stats]) => ({
    domain,
    total: stats.total,
    fileCount: stats.files.size,
  }))
  .sort((a, b) => b.total - a.total);

const output = {
  generatedAt: new Date().toISOString(),
  sourceFilesCount: files.length,
  totals: {
    routes: allRoutes.length,
    domains: normalizedDomain.length,
    apiRoutesMissingAuthGuard: missingAuth.length,
  },
  domainSummary: normalizedDomain.slice(0, 15),
  missingAuthCandidates: missingAuth.slice(0, 10),
};

const outPath = path.join(ROOT, 'docs', 'route-audit-summary.json');
fs.writeFileSync(outPath, `${JSON.stringify(output, null, 2)}\n`, 'utf8');

console.log(`Wrote ${path.relative(ROOT, outPath)} with ${allRoutes.length} routes.`);
console.log(`Missing-auth candidates: ${missingAuth.length}`);
