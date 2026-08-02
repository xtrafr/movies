import { requestTmdb } from '../server/tmdbProxy.js';

const runtimeEnv = globalThis.process?.env || {};

export default async function handler(request, response) {
  if (request.method !== 'GET') {
    response.setHeader('Allow', 'GET');
    return response.status(405).json({ error: 'Method not allowed' });
  }

  const url = new URL(request.url, 'http://localhost');
  const pathValues = url.searchParams.getAll('path');
  const endpoint = pathValues.length === 1 ? pathValues[0] : null;
  const result = await requestTmdb({
    endpoint,
    apiKey: runtimeEnv.TMDB_API_KEY || runtimeEnv.VITE_TMDB_API_KEY,
  });

  response.setHeader('Content-Type', result.contentType);
  if (result.status >= 200 && result.status < 300) {
    response.setHeader('Cache-Control', 's-maxage=120, stale-while-revalidate=900');
  } else {
    response.setHeader('Cache-Control', 'no-store');
  }
  return response.status(result.status).send(result.body);
}
