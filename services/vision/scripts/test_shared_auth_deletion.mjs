import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { spawn } from 'node:child_process';
import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';
import { mkdtemp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
const require = createRequire(resolve('platform/replit/artifacts/api-server/package.json'));
const Database = require('better-sqlite3');
const directory = await mkdtemp(join(tmpdir(), 'wellfarm-shared-auth-'));
const database = join(directory, 'test.sqlite');
const calls = [];
const identity = {id:'shared-user',email:'shared@example.com',email_confirmed_at:new Date().toISOString()};
const remote = createServer((req,res) => {
  calls.push(`${req.method} ${req.url}`);
  res.setHeader('Content-Type','application/json');
  if (req.method === 'GET' && req.url === '/auth/v1/user') res.end(JSON.stringify(identity));
  else {res.statusCode=500;res.end(JSON.stringify({message:'Shared identity mutation forbidden in this test'}));}
});
await new Promise(resolve => remote.listen(0,'127.0.0.1',resolve));
const server = spawn(process.execPath,['platform/replit/artifacts/api-server/dist/index.mjs'],{
  windowsHide:true,stdio:'ignore',env:{...process.env,PORT:'18082',DATABASE_PATH:database,UPLOAD_DIRECTORY:join(directory,'uploads'),AUTH_PROVIDER:'supabase',SUPABASE_PROJECT_MODE:'shared',SUPABASE_URL:`http://127.0.0.1:${remote.address().port}`,SUPABASE_PUBLISHABLE_KEY:'test-publishable',SUPABASE_SERVICE_ROLE_KEY:'test-admin-key-must-not-be-used'},
});
try {
  let ready=false;
  for(let i=0;i<40;i++){try{ready=(await fetch('http://127.0.0.1:18082/api/auth/config')).ok;}catch{}if(ready)break;await new Promise(r=>setTimeout(r,250));}
  assert.ok(ready);
  const fixture=new Database(database);
  fixture.prepare("INSERT INTO accounts (id,email,password_hash,profile,supabase_id) VALUES (?,?,'supabase','{}',?)").run(identity.id,identity.email,identity.id);
  fixture.prepare('INSERT INTO sessions (token_hash,account_id,expires_at,access_token) VALUES (?,?,?,?)').run(createHash('sha256').update('fixture-session').digest('hex'),identity.id,Date.now()+60000,'fixture-access');
  const headers={'Content-Type':'application/json',Cookie:'wellfarm_session=fixture-session'};
  const response=await fetch('http://127.0.0.1:18082/api/account',{method:'DELETE',headers,body:JSON.stringify({confirmEmail:identity.email})});
  assert.equal(response.status,204,await response.text());
  assert.equal(fixture.prepare('SELECT count(*) AS count FROM accounts').get().count,0);
  assert.equal(fixture.prepare('SELECT count(*) AS count FROM sessions').get().count,0);
  assert.deepEqual(calls,['GET /auth/v1/user'],'No deletion or global sign-out may reach shared Supabase');
  fixture.close();
  console.log('Shared-project account deletion passed: Wellfarm removed, remote identity untouched.');
} finally {server.kill();remote.closeAllConnections();await new Promise(resolve=>remote.close(resolve));}
