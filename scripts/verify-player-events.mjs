import assert from 'node:assert/strict';
import {
  getNextEpisodeSelection,
  normalizePlayerEvent,
  shouldAdvanceEpisode,
} from '../src/lib/playerEvents.js';
import { buildPlayerUrl } from '../src/lib/playerSources.js';

const ended = normalizePlayerEvent({ type: 'mplayer', event: 'ended' });
assert.equal(shouldAdvanceEpisode(ended), true);

const autoNext = normalizePlayerEvent({ type: 'mplayer', event: 'autonext' });
assert.equal(shouldAdvanceEpisode(autoNext), true);

const explicitNext = normalizePlayerEvent({ type: 'PLAYER_NEXT_EPISODE' });
assert.equal(shouldAdvanceEpisode(explicitNext), true);

const nearEnd = normalizePlayerEvent({
  type: 'SCREENSCAPE_GET_PROGRESS_RESPONSE',
  progress: { position: 3598, duration: 3600 },
});
assert.equal(shouldAdvanceEpisode(nearEnd), true);

const playing = normalizePlayerEvent({
  type: 'mplayer',
  event: 'timeupdate',
  currentTime: 1800,
  duration: 3600,
});
assert.equal(shouldAdvanceEpisode(playing), false);

assert.equal(shouldAdvanceEpisode(normalizePlayerEvent('finished')), true);
assert.equal(shouldAdvanceEpisode(normalizePlayerEvent({ type: 'mplayer', event: 'error' })), false);

assert.deepEqual(getNextEpisodeSelection({
  seasons: [{ season_number: 1 }, { season_number: 2 }],
  episodes: [{ episode_number: 1 }, { episode_number: 3 }, { episode_number: 2 }],
  activeSeason: 1,
  currentEpisode: 1,
}), { season: 1, episode: 2 });

assert.deepEqual(getNextEpisodeSelection({
  seasons: [{ season_number: 3 }, { season_number: 1 }, { season_number: 2 }],
  episodes: [{ episode_number: 8 }],
  activeSeason: 1,
  currentEpisode: 8,
}), { season: 2, episode: 1 });

assert.equal(getNextEpisodeSelection({
  seasons: [{ season_number: 1 }],
  episodes: [{ episode_number: 8 }],
  activeSeason: 1,
  currentEpisode: 8,
}), null);

for (const serverId of ['screenscape', 'apiplayer', 'moviesapi', 'embedapi']) {
  const tvUrl = new URL(buildPlayerUrl({ serverId, type: 'tv', id: 1399, season: 1, episode: 1 }));
  assert.equal(tvUrl.searchParams.get('autonext'), '1');
}

const movieUrl = new URL(buildPlayerUrl({ serverId: 'apiplayer', type: 'movie', id: 550 }));
assert.equal(movieUrl.searchParams.get('autonext'), null);

console.log('Player completion event checks passed.');
