import assert from 'node:assert/strict';
import { isSharedAuthProject } from '../../../platform/replit/artifacts/api-server/src/services/auth-project-policy.ts';

assert.equal(isSharedAuthProject({}), true, 'Missing configuration must not allow Auth user deletion');
assert.equal(isSharedAuthProject({SUPABASE_PROJECT_MODE:'shared'}), true);
assert.equal(isSharedAuthProject({SUPABASE_PROJECT_MODE:'dedicated',SUPABASE_URL:'https://wgnbgezilvygnmubwyny.supabase.co'}), false);
assert.equal(isSharedAuthProject({SUPABASE_PROJECT_MODE:'dedicated',SUPABASE_URL:'invalid'}), false);
assert.equal(isSharedAuthProject({SUPABASE_PROJECT_MODE:'dedicated',SUPABASE_URL:'https://dedicated-example.supabase.co'}), false);
console.log('Auth project ownership mode checks passed.');
