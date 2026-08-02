import assert from 'node:assert/strict';
import { randomBytes } from 'node:crypto';
import { createClient } from '@supabase/supabase-js';
import { performAccountAction } from '../server/accountAuth.js';

if (process.env.ALLOW_AUTH_TEST !== 'true') throw new Error('Set ALLOW_AUTH_TEST=true to run the temporary account test.');

const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY;
if (!supabaseUrl || !serviceRoleKey) throw new Error('Missing Supabase server credentials.');

const admin = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } });
const username = `verify_${randomBytes(5).toString('hex')}`;
const firstPassword = `First-${randomBytes(12).toString('base64url')}`;
const secondPassword = `Second-${randomBytes(12).toString('base64url')}`;
const racePasswords = [
  `Race-A-${randomBytes(12).toString('base64url')}`,
  `Race-B-${randomBytes(12).toString('base64url')}`,
];
const request = {
  headers: { host: 'localhost:5173', origin: 'http://localhost:5173', 'x-forwarded-for': `127.0.0.${Math.floor(Math.random() * 180) + 20}` },
  socket: {},
};
let userId;

const run = (action, body) => performAccountAction({ action, body: { action, ...body }, request, env: process.env });

try {
  const registration = await run('signup', { username, password: firstPassword });
  userId = registration.session.user.id;
  assert.equal(registration.session.user.user_metadata.username, username);
  assert.equal(registration.recoveryCodes.length, 8);
  assert.equal(new Set(registration.recoveryCodes).size, 8);

  const login = await run('signin', { username, password: firstPassword });
  assert.equal(login.session.user.id, userId);

  await assert.rejects(run('signin', { username, password: `${firstPassword}-wrong` }), /incorrect/i);
  await assert.rejects(run('recover', { username, recoveryCode: 'AAAA-BBBB-CCCC-DDDD-EEEE-FFFF', newPassword: secondPassword }), /incorrect/i);

  const recovered = await run('recover', { username, recoveryCode: registration.recoveryCodes[0], newPassword: secondPassword });
  assert.equal(recovered.session.user.id, userId);
  await assert.rejects(run('recover', { username, recoveryCode: registration.recoveryCodes[0], newPassword: firstPassword }), /incorrect/i);
  await assert.rejects(run('signin', { username, password: firstPassword }), /incorrect/i);
  const newLogin = await run('signin', { username, password: secondPassword });
  assert.equal(newLogin.session.user.id, userId);

  const recoveryRace = await Promise.allSettled(racePasswords.map((newPassword) => run('recover', {
    username,
    recoveryCode: registration.recoveryCodes[1],
    newPassword,
  })));
  assert.equal(recoveryRace.filter((result) => result.status === 'fulfilled').length, 1, 'A recovery code succeeded more than once');
  const winningPassword = racePasswords[recoveryRace.findIndex((result) => result.status === 'fulfilled')];
  const raceLogin = await run('signin', { username, password: winningPassword });
  assert.equal(raceLogin.session.user.id, userId);

  const { data: storedCodes, error: codesError } = await admin.from('user_recovery_codes').select('code_hash, code_salt').eq('user_id', userId);
  assert.ifError(codesError);
  assert.equal(storedCodes.length, 6, 'Used recovery codes were not removed');
  assert.equal(JSON.stringify(storedCodes).includes(registration.recoveryCodes[2]), false, 'A plaintext recovery code reached the database');
  console.log('Username registration, login, atomic password recovery, one-time codes and hashing verified.');
} finally {
  if (userId) {
    const { error } = await admin.auth.admin.deleteUser(userId);
    if (error) console.error('Temporary user cleanup failed:', error.message);
  }
}
