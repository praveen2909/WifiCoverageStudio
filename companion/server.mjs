import { createServer } from 'node:http';
import { spawn } from 'node:child_process';
import { createInterface } from 'node:readline';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { getRouterInfo } from './router-info.mjs';

const host = '127.0.0.1';
const port = Number(process.env.COMPANION_PORT ?? 8765);
if (!Number.isInteger(port) || port < 1 || port > 65535) {
  throw new Error('COMPANION_PORT must be an integer from 1 to 65535.');
}
const allowedOrigins = new Set([
  'http://localhost:4200',
  'http://127.0.0.1:4200',
]);
const ipinfoToken = process.env.IPINFO_TOKEN?.trim();
const readerPath = join(
  dirname(fileURLToPath(import.meta.url)),
  'bin',
  'WiFiCoverageStudioCompanion.app',
  'Contents',
  'MacOS',
  'wifi-reader',
);

let latestReading = {
  connected: false,
  ssid: null,
  rssiDbm: null,
  channel: null,
  timestamp: null,
  error: 'Waiting for the macOS Wi-Fi reader to start.',
};
let routerInfoCache = null;
let routerInfoExpiresAt = 0;
let routerInfoRequest = null;

async function getCachedRouterInfo() {
  if (routerInfoCache && Date.now() < routerInfoExpiresAt) {
    return routerInfoCache;
  }
  if (routerInfoRequest) {
    return routerInfoRequest;
  }

  routerInfoRequest = getRouterInfo()
    .then((info) => {
      routerInfoCache = info;
      routerInfoExpiresAt = Date.now() + 10_000;
      return info;
    })
    .finally(() => {
      routerInfoRequest = null;
    });

  return routerInfoRequest;
}

function updateReading(value) {
  const valid =
    typeof value === 'object' &&
    value !== null &&
    typeof value.connected === 'boolean' &&
    (typeof value.ssid === 'string' || value.ssid === null) &&
    (typeof value.rssiDbm === 'number' || value.rssiDbm === null) &&
    (typeof value.channel === 'number' || value.channel === null) &&
    typeof value.timestamp === 'string' &&
    (typeof value.error === 'string' || value.error === null);

  if (!valid) {
    console.error('Wi-Fi reader emitted an invalid reading.');
    latestReading = {
      ...latestReading,
      connected: false,
      rssiDbm: null,
      timestamp: new Date().toISOString(),
      error: 'The macOS Wi-Fi reader returned invalid data.',
    };
    return;
  }

  latestReading = value;
}

async function lookupProvider(response) {
  if (!ipinfoToken) {
    response.writeHead(503, { 'Content-Type': 'application/json; charset=utf-8' });
    response.end(JSON.stringify({
      message: 'IPinfo is not configured. Set IPINFO_TOKEN and restart the companion.',
    }));
    return;
  }

  const endpoint = new URL('https://api.ipinfo.io/lite/me');
  endpoint.searchParams.set('token', ipinfoToken);

  let upstream;
  try {
    upstream = await fetch(endpoint, { signal: AbortSignal.timeout(8000) });
  } catch (error) {
    console.error('Could not reach IPinfo Lite:', error);
    response.writeHead(502, { 'Content-Type': 'application/json; charset=utf-8' });
    response.end(JSON.stringify({ message: 'Could not reach IPinfo Lite. Check the companion internet connection.' }));
    return;
  }

  if (!upstream.ok) {
    const status = upstream.status === 429 ? 429 : upstream.status === 401 || upstream.status === 403 ? 502 : 502;
    const message = upstream.status === 429
      ? 'IPinfo Lite rate-limited the lookup. Wait a while before trying again.'
      : upstream.status === 401 || upstream.status === 403
        ? 'IPinfo rejected the token. Check IPINFO_TOKEN and your IPinfo account.'
        : `IPinfo Lite returned HTTP ${upstream.status}.`;
    response.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' });
    response.end(JSON.stringify({ message }));
    return;
  }

  let result;
  try {
    result = await upstream.json();
  } catch (error) {
    console.error('Could not parse IPinfo Lite response:', error);
    response.writeHead(502, { 'Content-Type': 'application/json; charset=utf-8' });
    response.end(JSON.stringify({ message: 'IPinfo Lite returned invalid JSON.' }));
    return;
  }

  const organization =
    typeof result?.as_name === 'string' ? result.as_name.trim() : '';
  const domain =
    typeof result?.as_domain === 'string' ? result.as_domain.trim() : '';
  const asn = typeof result?.asn === 'string' ? result.asn.trim() : '';
  const provider = organization || domain || asn;
  if (!provider) {
    response.writeHead(502, { 'Content-Type': 'application/json; charset=utf-8' });
    response.end(JSON.stringify({ message: 'IPinfo Lite did not return an ASN organization for this connection.' }));
    return;
  }

  response.writeHead(200, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff',
  });
  response.end(JSON.stringify({
    provider,
    asn: asn || null,
    domain: domain || null,
  }));
}

if (process.platform === 'darwin') {
  const reader = spawn(readerPath, [], { stdio: ['ignore', 'pipe', 'inherit'] });
  const lines = createInterface({ input: reader.stdout });

  lines.on('line', (line) => {
    try {
      updateReading(JSON.parse(line));
    } catch (error) {
      console.error('Could not parse Wi-Fi reader output:', error);
    }
  });

  reader.on('error', (error) => {
    console.error('Could not start the macOS Wi-Fi reader:', error);
    latestReading = {
      ...latestReading,
      error: 'Build the companion reader with `npm run build` before starting the service.',
    };
  });

  reader.on('exit', (code, signal) => {
    console.error(`macOS Wi-Fi reader stopped (code ${code}, signal ${signal}).`);
    latestReading = {
      ...latestReading,
      connected: false,
      rssiDbm: null,
      timestamp: new Date().toISOString(),
      error: 'The macOS Wi-Fi reader stopped. Restart the companion service.',
    };
  });
} else {
  latestReading.error = 'The bundled Wi-Fi reader currently supports macOS only.';
}

const server = createServer((request, response) => {
  const origin = request.headers.origin;
  const validHost = request.headers.host === `${host}:${port}` ||
    request.headers.host === `localhost:${port}`;

  if (!validHost || !origin || !allowedOrigins.has(origin)) {
    response.writeHead(403);
    response.end('Forbidden');
    return;
  }

  if (origin) {
    response.setHeader('Access-Control-Allow-Origin', origin);
    response.setHeader('Vary', 'Origin');
  }

  if (
    request.method === 'OPTIONS' &&
    (request.url === '/api/v1/wifi/current' || request.url === '/api/v1/provider')
  ) {
    response.writeHead(204, {
      'Access-Control-Allow-Methods': 'GET',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Access-Control-Max-Age': '600',
    });
    response.end();
    return;
  }

  if (request.method === 'GET' && request.url === '/api/v1/wifi/current') {
    void getCachedRouterInfo().then((routerInfo) => {
      response.writeHead(200, {
        'Content-Type': 'application/json; charset=utf-8',
        'Cache-Control': 'no-store',
        'X-Content-Type-Options': 'nosniff',
      });
      response.end(JSON.stringify({ ...latestReading, ...routerInfo }));
    });
    return;
  }

  if (request.method === 'GET' && request.url === '/api/v1/provider') {
    void lookupProvider(response);
    return;
  }

  response.writeHead(404);
  response.end('Not found');
});

server.listen(port, host, () => {
  console.log(`Wi-Fi companion listening on http://${host}:${port}`);
});

for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, () => {
    server.close(() => process.exit(0));
  });
}
