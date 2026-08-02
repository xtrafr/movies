import {
  createHash,
  createHmac,
  randomBytes,
  randomUUID,
  timingSafeEqual,
} from 'node:crypto';
import { createClient } from '@supabase/supabase-js';

const USERNAME_PATTERN = /^[a-z0-9_]{3,24}$/;
const RECOVERY_CODE_COUNT = 8;

function getRuntimeConfig(env = process.env) {
  return {
    supabaseUrl: env.SUPABASE_URL || env.NEXT_PUBLIC_SUPABASE_URL || env.VITE_SUPABASE_URL,
    publishableKey: env.SUPABASE_PUBLISHABLE_KEY
      || env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
      || env.NEXT_PUBLIC_SUPABASE_ANON_KEY
      || env.VITE_SUPABASE_PUBLISHABLE_KEY,
    serviceRoleKey: env.SUPABASE_SERVICE_ROLE_KEY || env.SUPABASE_SECRET_KEY,
  };
}

function clientsFor(env) {
  const config = getRuntimeConfig(env);
  if (!config.supabaseUrl || !config.publishableKey || !config.serviceRoleKey) {
    throw Object.assign(new Error('Account service is not configured.'), { status: 503 });
  }
  const authOptions = { auth: { autoRefreshToken: false, detectSessionInUrl: false, persistSession: false } };
  return {
    config,
    admin: createClient(config.supabaseUrl, config.serviceRoleKey, authOptions),
    publicClient: createClient(config.supabaseUrl, config.publishableKey, authOptions),
  };
}

function normalizeUsername(value) {
  return typeof value === 'string' ? value.trim().toLowerCase() : '';
}

function validateUsername(value) {
  const username = normalizeUsername(value);
  if (!USERNAME_PATTERN.test(username)) {
    throw Object.assign(new Error('Use 3 to 24 lowercase letters, numbers, or underscores.'), { status: 400 });
  }
  return username;
}

function validatePassword(value) {
  if (typeof value !== 'string' || value.length < 12 || value.length > 128) {
    throw Object.assign(new Error('Use a password between 12 and 128 characters.'), { status: 400 });
  }
  return value;
}

function normalizeRecoveryCode(value) {
  return typeof value === 'string' ? value.toUpperCase().replace(/[^A-F0-9]/g, '') : '';
}

function makeRecoveryCode() {
  return randomBytes(12).toString('hex').toUpperCase().match(/.{1,4}/g).join('-');
}

function hashRecoveryCode(code, salt) {
  return createHash('sha256').update(`${salt}:${normalizeRecoveryCode(code)}`).digest('hex');
}

function safeEqualHex(first, second) {
  if (typeof first !== 'string' || typeof second !== 'string' || first.length !== second.length) return false;
  return timingSafeEqual(Buffer.from(first, 'hex'), Buffer.from(second, 'hex'));
}

function getRequestIp(request) {
  const forwarded = request.headers?.['x-forwarded-for'];
  const first = Array.isArray(forwarded) ? forwarded[0] : forwarded?.split(',')[0];
  return String(first || request.socket?.remoteAddress || 'unknown').trim();
}

function requestHost(request) {
  const forwarded = request.headers?.['x-forwarded-host'];
  return String((Array.isArray(forwarded) ? forwarded[0] : forwarded) || request.headers?.host || '').split(',')[0].trim();
}

function assertSameOrigin(request) {
  const origin = request.headers?.origin;
  if (!origin) return;
  try {
    if (new URL(origin).host !== requestHost(request)) throw new Error('mismatch');
  } catch {
    throw Object.assign(new Error('Request origin was rejected.'), { status: 403 });
  }
}

function rateKey(secret, action, ...parts) {
  return `${action}:${createHmac('sha256', secret).update(parts.join(':')).digest('hex')}`;
}

async function consumeRateLimit(admin, key, limit, windowSeconds) {
  const { data, error } = await admin.rpc('consume_auth_rate_limit', {
    p_key: key,
    p_limit: limit,
    p_window_seconds: windowSeconds,
  });
  if (error) throw Object.assign(new Error('Account security check failed.'), { status: 503, cause: error });
  if (!data) throw Object.assign(new Error('Too many attempts. Please wait and try again.'), { status: 429 });
}

function publicSession(session) {
  if (!session?.access_token || !session?.refresh_token) return null;
  return {
    access_token: session.access_token,
    refresh_token: session.refresh_token,
    expires_in: session.expires_in,
    expires_at: session.expires_at,
    token_type: session.token_type,
    user: session.user,
  };
}

async function signInWithHiddenEmail(publicClient, email, password) {
  const { data, error } = await publicClient.auth.signInWithPassword({ email, password });
  if (error || !data.session) {
    throw Object.assign(new Error('The username or password is incorrect.'), { status: 401 });
  }
  return publicSession(data.session);
}

async function accountByUsername(admin, username) {
  const { data, error } = await admin
    .from('user_accounts')
    .select('user_id, username')
    .eq('username_normalized', username)
    .maybeSingle();
  if (error) throw Object.assign(new Error('Account lookup failed.'), { status: 503, cause: error });
  return data;
}

async function hiddenEmailFor(admin, userId) {
  const { data, error } = await admin.auth.admin.getUserById(userId);
  if (error || !data.user?.email) throw Object.assign(new Error('The username or password is incorrect.'), { status: 401 });
  return data.user.email;
}

export async function performAccountAction({ action, body, request, env = process.env }) {
  assertSameOrigin(request);
  const { admin, publicClient, config } = clientsFor(env);
  const username = validateUsername(body?.username);
  const ip = getRequestIp(request);

  await consumeRateLimit(admin, rateKey(config.serviceRoleKey, `${action}-ip`, ip), action === 'signin' ? 60 : 10, action === 'signup' ? 3600 : 1800);
  await consumeRateLimit(admin, rateKey(config.serviceRoleKey, `${action}-account`, ip, username), action === 'signin' ? 12 : 8, 1800);

  if (action === 'signup') {
    const password = validatePassword(body?.password);
    if (await accountByUsername(admin, username)) {
      throw Object.assign(new Error('That username is already taken.'), { status: 409 });
    }

    const hiddenEmail = `${randomUUID()}@accounts.movies.xtra.wtf`;
    const { data: created, error: createError } = await admin.auth.admin.createUser({
      email: hiddenEmail,
      password,
      email_confirm: true,
      user_metadata: { username },
      app_metadata: { account_type: 'username' },
    });
    if (createError || !created.user) {
      throw Object.assign(new Error('The account could not be created.'), { status: 503, cause: createError });
    }

    try {
      const { error: accountError } = await admin.from('user_accounts').insert({
        user_id: created.user.id,
        username,
        username_normalized: username,
      });
      if (accountError) {
        if (accountError.code === '23505') throw Object.assign(new Error('That username is already taken.'), { status: 409 });
        throw accountError;
      }

      const recoveryCodes = Array.from({ length: RECOVERY_CODE_COUNT }, makeRecoveryCode);
      const storedCodes = recoveryCodes.map((code) => {
        const salt = randomBytes(18).toString('base64url');
        return { user_id: created.user.id, code_salt: salt, code_hash: hashRecoveryCode(code, salt) };
      });
      const { error: codesError } = await admin.from('user_recovery_codes').insert(storedCodes);
      if (codesError) throw codesError;

      const session = await signInWithHiddenEmail(publicClient, hiddenEmail, password);
      return { session, recoveryCodes, username };
    } catch (error) {
      await admin.auth.admin.deleteUser(created.user.id);
      if (error?.status) throw error;
      throw Object.assign(new Error('The account could not be created.'), { status: 503, cause: error });
    }
  }

  const account = await accountByUsername(admin, username);
  if (!account) throw Object.assign(new Error('The username or password is incorrect.'), { status: 401 });
  const hiddenEmail = await hiddenEmailFor(admin, account.user_id);

  if (action === 'signin') {
    return { session: await signInWithHiddenEmail(publicClient, hiddenEmail, validatePassword(body?.password)), username };
  }

  if (action === 'recover') {
    const newPassword = validatePassword(body?.newPassword);
    const normalizedCode = normalizeRecoveryCode(body?.recoveryCode);
    if (normalizedCode.length !== 24) {
      throw Object.assign(new Error('The username or backup code is incorrect.'), { status: 401 });
    }

    const { data: storedCodes, error: codesError } = await admin
      .from('user_recovery_codes')
      .select('code_salt, code_hash')
      .eq('user_id', account.user_id);
    if (codesError) throw Object.assign(new Error('Account recovery is unavailable.'), { status: 503, cause: codesError });
    const matchingCode = storedCodes.find((stored) => safeEqualHex(hashRecoveryCode(normalizedCode, stored.code_salt), stored.code_hash));
    if (!matchingCode) throw Object.assign(new Error('The username or backup code is incorrect.'), { status: 401 });

    const { data: codeConsumed, error: consumeError } = await admin.rpc('consume_recovery_code', {
      p_user_id: account.user_id,
      p_code_hash: matchingCode.code_hash,
    });
    if (consumeError) throw Object.assign(new Error('Account recovery is unavailable.'), { status: 503, cause: consumeError });
    if (!codeConsumed) throw Object.assign(new Error('The username or backup code is incorrect.'), { status: 401 });

    const { error: passwordError } = await admin.auth.admin.updateUserById(account.user_id, { password: newPassword });
    if (passwordError) throw Object.assign(new Error('The password could not be changed.'), { status: 503, cause: passwordError });

    return { session: await signInWithHiddenEmail(publicClient, hiddenEmail, newPassword), username };
  }

  throw Object.assign(new Error('Unknown account action.'), { status: 400 });
}

function parseBody(request) {
  if (request.body && typeof request.body === 'object') return request.body;
  if (typeof request.body === 'string') {
    if (Buffer.byteLength(request.body) > 8192) throw Object.assign(new Error('Request is too large.'), { status: 413 });
    return JSON.parse(request.body);
  }
  return {};
}

export async function handleAccountRequest(request, response, env = process.env) {
  const sendJson = (status, payload) => {
    if (typeof response.status === 'function') return response.status(status).json(payload);
    response.statusCode = status;
    response.end(JSON.stringify(payload));
    return undefined;
  };
  response.setHeader('Cache-Control', 'no-store');
  response.setHeader('Content-Type', 'application/json');
  if (request.method !== 'POST') {
    response.setHeader('Allow', 'POST');
    return sendJson(405, { error: 'Method not allowed.' });
  }

  try {
    const body = parseBody(request);
    const action = body?.action;
    if (!['signup', 'signin', 'recover'].includes(action)) {
      throw Object.assign(new Error('Unknown account action.'), { status: 400 });
    }
    const result = await performAccountAction({ action, body, request, env });
    return sendJson(200, { ok: true, ...result });
  } catch (error) {
    const status = Number(error?.status) || (error instanceof SyntaxError ? 400 : 500);
    if (status >= 500) console.error('Account API error:', error?.cause || error);
    return sendJson(status, { error: status >= 500 ? 'Account service is temporarily unavailable.' : error.message });
  }
}
