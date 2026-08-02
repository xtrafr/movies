import { checkPlayerSource } from '../server/playerHealth.js';

export default async function handler(request, response) {
  const { server, type, id, season = '1', episode = '1' } = request.query;

  if (!server || !id || !['movie', 'tv'].includes(type)) {
    return response.status(400).json({ ok: false, reason: 'Invalid request' });
  }

  const result = await checkPlayerSource({
    serverId: server,
    type,
    id,
    season: Number(season),
    episode: Number(episode),
  });

  response.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate=300');
  return response.status(200).json(result);
}
