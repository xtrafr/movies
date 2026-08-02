import { buildPlayerUrl, PLAYER_SOURCES } from '../src/lib/playerSources.js';

const FAILURE_TEXT = /temporarily rate limited|error\s*1027|video unavailable|content unavailable|access denied|sandbox detected|not found|service unavailable|bad gateway|gateway timeout|captcha|just a moment|checking your browser|verify you are human|attention required/i;

export async function checkPlayerSource({ serverId, type, id, season, episode }) {
  if (!PLAYER_SOURCES.some((source) => source.id === serverId)) {
    return { ok: false, status: 400, reason: 'Unknown source' };
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 6500);

  try {
    const response = await fetch(buildPlayerUrl({ serverId, type, id, season, episode }), {
      redirect: 'follow',
      signal: controller.signal,
      headers: {
        Accept: 'text/html,application/xhtml+xml',
        'User-Agent': 'MovieFY source health check',
      },
    });

    const body = await response.text();
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
