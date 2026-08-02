import { randomUUID } from 'node:crypto';
import { createClient } from '@supabase/supabase-js';

if (process.env.ALLOW_AUTH_TEST !== 'true') {
  throw new Error('Set ALLOW_AUTH_TEST=true to create and clean up temporary authentication users.');
}

const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const publishableKey = process.env.SUPABASE_PUBLISHABLE_KEY
  || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
  || process.env.SUPABASE_ANON_KEY
  || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY;

if (!supabaseUrl || !publishableKey || !serviceRoleKey) {
  throw new Error('Supabase URL, publishable key, and service-role key are required.');
}

const clientOptions = {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
    detectSessionInUrl: false,
  },
};
const admin = createClient(supabaseUrl, serviceRoleKey, clientOptions);
const primary = createClient(supabaseUrl, publishableKey, clientOptions);
const secondary = createClient(supabaseUrl, publishableKey, clientOptions);
const testId = randomUUID().replaceAll('-', '');
const password = `MovieFY!${randomUUID()}aA9`;
const primaryEmail = `moviefy-auth-${testId}@movies.xtra.wtf`;
const secondaryEmail = `moviefy-rls-${testId}@movies.xtra.wtf`;
const createdUserIds = [];
const mediaId = Number(`98${Date.now().toString().slice(-8)}`);
const verifyPublicSignup = process.env.VERIFY_PUBLIC_SIGNUP === 'true';

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function cleanup() {
  const cleanupErrors = [];
  for (const userId of createdUserIds) {
    const { error: libraryError } = await admin.from('user_library').delete().eq('user_id', userId);
    const { error: preferencesError } = await admin.from('user_preferences').delete().eq('user_id', userId);
    const { error: userError } = await admin.auth.admin.deleteUser(userId);
    if (libraryError) cleanupErrors.push(libraryError.message);
    if (preferencesError) cleanupErrors.push(preferencesError.message);
    if (userError) cleanupErrors.push(userError.message);
  }
  if (cleanupErrors.length) throw new Error(`Auth test cleanup failed: ${cleanupErrors.join('; ')}`);
}

try {
  const { data: registration, error: registrationError } = verifyPublicSignup
    ? await primary.auth.signUp({ email: primaryEmail, password })
    : await admin.auth.admin.createUser({ email: primaryEmail, password, email_confirm: true });
  if (registrationError) throw registrationError;
  assert(registration.user?.id, 'Registration did not create a user.');
  createdUserIds.push(registration.user.id);

  if (verifyPublicSignup) {
    const { error: confirmationError } = await admin.auth.admin.updateUserById(registration.user.id, {
      email_confirm: true,
    });
    if (confirmationError) throw confirmationError;
  }

  const { data: firstLogin, error: firstLoginError } = await primary.auth.signInWithPassword({
    email: primaryEmail,
    password,
  });
  if (firstLoginError) throw firstLoginError;
  assert(firstLogin.user?.id === registration.user.id && firstLogin.session, 'First login did not return the expected session.');

  const { error: signOutError } = await primary.auth.signOut();
  if (signOutError) throw signOutError;

  const { data: secondLogin, error: secondLoginError } = await primary.auth.signInWithPassword({
    email: primaryEmail,
    password,
  });
  if (secondLoginError) throw secondLoginError;
  assert(secondLogin.user?.id === registration.user.id && secondLogin.session, 'Login after sign-out failed.');

  const { error: ownInsertError } = await primary.from('user_library').upsert({
    user_id: registration.user.id,
    media_type: 'movie',
    media_id: mediaId,
    metadata: { id: mediaId, media_type: 'movie', title: 'MovieFY security test' },
    saved: true,
    saved_at: new Date().toISOString(),
  });
  if (ownInsertError) throw ownInsertError;

  const { data: ownRows, error: ownReadError } = await primary
    .from('user_library')
    .select('user_id, media_id')
    .eq('media_id', mediaId);
  if (ownReadError) throw ownReadError;
  assert(ownRows?.length === 1 && ownRows[0].user_id === registration.user.id, 'The user could not read their own library row.');

  const { data: secondUser, error: secondUserError } = await admin.auth.admin.createUser({
    email: secondaryEmail,
    password,
    email_confirm: true,
  });
  if (secondUserError) throw secondUserError;
  assert(secondUser.user?.id, 'The isolation test user could not be created.');
  createdUserIds.push(secondUser.user.id);

  const { error: secondaryLoginError } = await secondary.auth.signInWithPassword({
    email: secondaryEmail,
    password,
  });
  if (secondaryLoginError) throw secondaryLoginError;

  const { data: foreignRows, error: foreignReadError } = await secondary
    .from('user_library')
    .select('user_id, media_id')
    .eq('media_id', mediaId);
  if (foreignReadError) throw foreignReadError;
  assert(foreignRows?.length === 0, 'Row Level Security exposed another user\'s row.');

  const { error: foreignInsertError } = await secondary.from('user_library').insert({
    user_id: registration.user.id,
    media_type: 'movie',
    media_id: mediaId + 1,
    metadata: { id: mediaId + 1, media_type: 'movie', title: 'Blocked security test' },
    saved: true,
  });
  assert(foreignInsertError, 'Row Level Security allowed a write using another user\'s ID.');

  const { error: ownDeleteError } = await primary
    .from('user_library')
    .delete()
    .eq('media_id', mediaId);
  if (ownDeleteError) throw ownDeleteError;

  console.log(`${verifyPublicSignup ? 'Public registration' : 'Disposable account creation'}: PASS`);
  console.log('Login and sign-out: PASS');
  console.log('Own-library access: PASS');
  console.log('Cross-user read/write isolation: PASS');
} finally {
  await cleanup();
}
