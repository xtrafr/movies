import { checkPlayerSource } from '../server/playerHealth.js';
import { PLAYER_SOURCES } from '../src/lib/playerSources.js';

const results = await Promise.all(PLAYER_SOURCES.map(async (source) => ({
  source: source.label,
  ...(await checkPlayerSource({
    serverId: source.id,
    type: 'tv',
    id: 1396,
    season: 1,
    episode: 1,
  })),
})));

console.table(results);
if (results.some((result) => !result.ok)) process.exitCode = 1;
