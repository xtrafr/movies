const TMDB_ORIGIN = 'https://api.themoviedb.org';

const ALLOWED_PATHS = [
  /^\/3\/trending\/(?:movie|tv|all)\/day$/,
  /^\/3\/discover\/(?:movie|tv)$/,
  /^\/3\/search\/multi$/,
  /^\/3\/(?:movie|tv)\/\d+$/,
  /^\/3\/tv\/\d+\/season\/\d+$/,
];

function jsonResult(status, message) {
  return {
    status,
    contentType: 'application/json; charset=utf-8',
    body: JSON.stringify({ error: message }),
  };
}

export async function requestTmdb({ endpoint, apiKey }) {
  if (!apiKey) return jsonResult(503, 'TMDB is not configured');
  if (!endpoint || typeof endpoint !== 'string' || endpoint.length > 2000) return jsonResult(400, 'Invalid TMDB path');

  let target;
  try {
    target = new URL(endpoint, `${TMDB_ORIGIN}/3/`);
  } catch {
    return jsonResult(400, 'Invalid TMDB path');
  }

  if (target.origin !== TMDB_ORIGIN || !ALLOWED_PATHS.some((pattern) => pattern.test(target.pathname))) {
    return jsonResult(400, 'TMDB path is not allowed');
  }

  target.searchParams.set('api_key', apiKey);
  if (!target.searchParams.has('language')) target.searchParams.set('language', 'en-US');

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);

  try {
    const response = await fetch(target, {
      signal: controller.signal,
      headers: { Accept: 'application/json' },
    });
    return {
      status: response.status,
      contentType: response.headers.get('content-type') || 'application/json; charset=utf-8',
      body: await response.text(),
    };
  } catch (error) {
    return jsonResult(502, error.name === 'AbortError' ? 'TMDB timed out' : 'TMDB could not be reached');
  } finally {
    clearTimeout(timeout);
  }
}
