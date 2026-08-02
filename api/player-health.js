import { checkPlayerSource } from '../server/playerHealth.js';

export default async function handler(request, response) {
  if (request.method !== 'GET') {
    response.setHeader('Allow', 'GET');
    return response.status(405).json({ ok: false, reason: 'Method not allowed' });
  }

  const { server, type, id, season = '1', episode = '1' } = request.query;

  if (!server || !id || !['movie', 'tv'].includes(type) || Array.isArray(server) || Array.isArray(id)) {
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
  return response.status(result.status === 400 ? 400 : 200).json(result);
}
