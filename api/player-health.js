import { checkPlayerSource } from '../server/playerHealth.js';

export default async function handler(request, response) {
  if (request.method !== 'GET') {
    response.setHeader('Allow', 'GET');
    return response.status(405).json({ ok: false, reason: 'Method not allowed' });
  }

  const url = new URL(request.url, 'http://localhost');
  const serverValues = url.searchParams.getAll('server');
  const typeValues = url.searchParams.getAll('type');
  const idValues = url.searchParams.getAll('id');
  const server = serverValues[0];
  const type = typeValues[0];
  const id = idValues[0];
  const season = url.searchParams.get('season') || '1';
  const episode = url.searchParams.get('episode') || '1';

  if (
    !server ||
    !id ||
    !['movie', 'tv'].includes(type) ||
    serverValues.length !== 1 ||
    typeValues.length !== 1 ||
    idValues.length !== 1
  ) {
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
