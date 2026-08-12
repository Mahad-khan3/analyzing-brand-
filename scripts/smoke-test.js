/* BrandPilot AI — end-to-end smoke test against an ephemeral in-memory MongoDB.
 * Usage: node scripts/smoke-test.js
 */
const { MongoMemoryServer } = require('mongodb-memory-server');

const PORT = 3100;
const BASE = `http://localhost:${PORT}/api/v1`;
const EMAIL = `smoke-${Date.now()}@example.com`;
const PASSWORD = 'SmokeTest123!';
let token = null;
let workspaceId = null;
let brandId = null;
let contentId = null;
let pass = 0;
let fail = 0;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const log = (name, ok, detail = '') => {
  if (ok) {
    pass++;
    console.log(`  PASS  ${name}${detail ? ` — ${detail}` : ''}`);
  } else {
    fail++;
    console.log(`  FAIL  ${name}${detail ? ` — ${detail}` : ''}`);
  }
  return ok;
};

const call = async (method, path, body, auth = true) => {
  const headers = { 'Content-Type': 'application/json' };
  if (auth && token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  let json = null;
  try { json = await res.json(); } catch { /* empty body */ }
  return { status: res.status, json };
};

async function main() {
  console.log('\n=== BrandPilot AI smoke test ===\n');

  const mongod = await MongoMemoryServer.create();
  process.env.MONGODB_URI = mongod.getUri('brandpilot');
  process.env.PORT = String(PORT);
  process.env.REDIS_ENABLED = 'false';
  process.env.NODE_ENV = 'test';

  require('../src/server');

  let up = false;
  for (let i = 0; i < 40; i++) {
    try {
      await fetch(`${BASE}/health`);
      up = true;
      break;
    } catch { await sleep(250); }
  }
  if (!log('server started', up)) {
    await mongod.stop();
    process.exit(1);
  }

  // health
  let r = await call('GET', '/health', null, false);
  log('GET /health', r.status === 200 && r.json?.success === true);

  // register
  r = await call('POST', '/auth/register', { name: 'Smoke Tester', email: EMAIL, password: PASSWORD }, false);
  const code = r.json?.data?.devCode;
  log('POST /auth/register', r.status === 201 && r.json?.data?.requiresVerification === true, `devCode=${code}`);

  // verify email
  r = await call('POST', '/auth/verify-email', { email: EMAIL, code }, false);
  log('POST /auth/verify-email', r.status === 200 && !!r.json?.data?.accessToken);
  token = r.json?.data?.accessToken;

  // me
  r = await call('GET', '/auth/me');
  log('GET /auth/me', r.status === 200 && r.json?.data?.user?.email === EMAIL);

  // login
  r = await call('POST', '/auth/login', { email: EMAIL, password: PASSWORD }, false);
  log('POST /auth/login', r.status === 200 && !!r.json?.data?.accessToken, r.json?.message || '');
  token = r.json?.data?.accessToken;

  // workspace create
  r = await call('POST', '/workspaces', { name: 'Smoke Workspace', description: 'created by smoke test' });
  workspaceId = r.json?.data?.workspace?._id;
  log('POST /workspaces', r.status === 201 && !!workspaceId);

  // workspaces list
  r = await call('GET', '/workspaces');
  log('GET /workspaces', r.status === 200 && Array.isArray(r.json?.data?.workspaces) && r.json.data.workspaces.length >= 1);

  // workspace detail
  r = await call('GET', `/workspaces/${workspaceId}`);
  log('GET /workspaces/:id', r.status === 200 && !!r.json?.data?.workspace, `brands=${r.json?.data?.brands?.length}`);

  // switch workspace
  r = await call('POST', `/workspaces/${workspaceId}/switch`);
  log('POST /workspaces/:id/switch', r.status === 200);

  // brand create
  r = await call('POST', '/brands', { workspaceId, name: 'Smoke Brand', description: 'A test brand', industry: 'Technology' });
  brandId = r.json?.data?.brand?._id;
  log('POST /brands', r.status === 201 && !!brandId);

  // brand list
  r = await call('GET', `/brands?workspaceId=${workspaceId}`);
  log('GET /brands', r.status === 200 && r.json?.data?.brands?.length >= 1);

  // brand detail
  r = await call('GET', `/brands/${brandId}?workspaceId=${workspaceId}`);
  log('GET /brands/:id', r.status === 200 && r.json?.data?.brand?._id === brandId);

  // subscription
  r = await call('POST', '/subscriptions/upgrade', { workspaceId, plan: 'pro' });
  log('POST /subscriptions/upgrade', r.status === 200 && r.json?.data?.subscription?.plan === 'pro');
  r = await call('GET', `/subscriptions?workspaceId=${workspaceId}`);
  log('GET /subscriptions', r.status === 200 && !!r.json?.data?.subscription);

  // social platforms
  r = await call('GET', `/social/platforms?workspaceId=${workspaceId}`);
  log('GET /social/platforms', r.status === 200 && Array.isArray(r.json?.data?.platforms));

  // social accounts
  r = await call('GET', `/social?workspaceId=${workspaceId}`);
  log('GET /social (accounts)', r.status === 200 && Array.isArray(r.json?.data?.accounts));

  // competitors
  r = await call('POST', '/competitors', { workspaceId, name: 'Acme Rival', website: 'https://acme.example' });
  log('POST /competitors', r.status === 201 && !!r.json?.data?.competitor?._id);
  r = await call('GET', `/competitors?workspaceId=${workspaceId}`);
  log('GET /competitors', r.status === 200 && r.json?.data?.competitors?.length >= 1);

  // content create
  r = await call('POST', '/content', {
    workspaceId, brandId, type: 'promotional', title: 'Smoke post', caption: 'Hello from smoke test',
    platforms: ['instagram', 'facebook'],
  });
  contentId = r.json?.data?.content?._id;
  log('POST /content', r.status === 201 && !!contentId);

  // content list
  r = await call('GET', `/content?workspaceId=${workspaceId}`);
  log('GET /content', r.status === 200 && r.json?.data?.items?.length >= 1);

  // schedule
  const at = new Date(Date.now() + 3600_000).toISOString();
  r = await call('POST', `/content/${contentId}/schedule`, { workspaceId, scheduledAt: at });
  log('POST /content/:id/schedule', r.status === 200 && r.json?.data?.queueMode !== undefined, `queue=${r.json?.data?.queueMode}`);

  // calendar
  r = await call('GET', `/calendar?workspaceId=${workspaceId}`);
  log('GET /calendar', r.status === 200);

  // analytics
  r = await call('GET', `/analytics?workspaceId=${workspaceId}`);
  log('GET /analytics', r.status === 200);

  // media + library (empty lists)
  r = await call('GET', `/media?workspaceId=${workspaceId}`);
  log('GET /media', r.status === 200);
  r = await call('GET', `/library?workspaceId=${workspaceId}`);
  log('GET /library', r.status === 200);

  // notifications
  r = await call('GET', '/notifications');
  log('GET /notifications', r.status === 200 && r.json?.data?.unread >= 1, `unread=${r.json?.data?.unread}`);

  // activity
  r = await call('GET', `/activity?workspaceId=${workspaceId}`);
  log('GET /activity', r.status === 200 && r.json?.data?.items?.length >= 1);

  // scheduler status
  r = await call('GET', `/scheduler/status?workspaceId=${workspaceId}`);
  log('GET /scheduler/status', r.status === 200, `redis=${r.json?.data?.redisAvailable}`);

  // logout
  r = await call('POST', '/auth/logout');
  log('POST /auth/logout', r.status === 200);

  console.log(`\n=== ${pass} passed, ${fail} failed ===`);
  await mongod.stop();
  process.exit(fail ? 1 : 0);
}

main().catch((err) => {
  console.error('\nSMOKE TEST ERROR:', err);
  process.exit(1);
});
