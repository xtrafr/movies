import { buildPlayerUrl, PLAYER_SOURCES } from '../src/lib/playerSources.js';

const FAILURE_TEXT = /temporarily rate limited|error\s*1027|video unavailable|content unavailable|access denied|sandbox detected|not found|service unavailable|bad gateway|gateway timeout|captcha|just a moment|checking your browser|verify you are human|attention required/i;

function isPositiveInteger(value, max = Number.MAX_SAFE_INTEGER) {
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed > 0 && parsed <= max;
}

export async function checkPlayerSource({ serverId, type, id, season, episode }) {
  if (!PLAYER_SOURCES.some((source) => source.id === serverId)
    || !['movie', 'tv'].includes(type)
    || !isPositiveInteger(id, 100000000)
    || (type === 'tv' && (!isPositiveInteger(season, 1000) || !isPositiveInteger(episode, 10000)))) {
    return { ok: false, status: 400, reason: 'Invalid source request' };
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 6500);

  try {
    const response = await fetch(buildPlayerUrl({ serverId, type, id, season, episode }), {
      redirect: 'follow',
      signal: controller.signal,
      headers: {
        Accept: 'text/html,application/xhtml+xml',
        Referer: 'https://movies.xtra.wtf/',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Safari/537.36',
      },
    });

    const body = await response.text();
    if ([401, 403].includes(response.status)) {
      return {
        ok: true,
        status: response.status,
        unverified: true,
        reason: 'Provider requires a browser request',
      };
    }
    const failed = !response.ok || body.length < 250 || FAILURE_TEXT.test(body.slice(0, 100000));
    return {
      ok: !failed,
      status: response.status,
      reason: failed ? 'Source returned an error page' : undefined,
    };
  } catch (error) {
    return {
      ok: false,
      status: 0,
      reason: error.name === 'AbortError' ? 'Source timed out' : 'Source could not be reached',
    };
  } finally {
    clearTimeout(timeout);
  }
}
