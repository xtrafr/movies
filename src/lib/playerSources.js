export const PLAYER_SOURCES = [
  { id: 'vidphantom', label: 'VidPhantom', baseUrl: 'https://vidphantom.com', sandboxCompatible: true },
  { id: 'vidking', label: 'VidKing', baseUrl: 'https://www.vidking.net/embed', sandboxCompatible: false },
  { id: '2embed', label: '2Embed', baseUrl: 'https://www.2embed.stream/embed', sandboxCompatible: false },
  { id: 'vidzee', label: 'VidZee', baseUrl: 'https://player.vidzee.wtf/embed', sandboxCompatible: false },
  { id: 'vidcore', label: 'VidCore', baseUrl: 'https://vidcore.org/embed', sandboxCompatible: true },
];

export function buildPlayerUrl({ serverId, type, id, season = 1, episode = 1 }) {
  const source = PLAYER_SOURCES.find((candidate) => candidate.id === serverId) || PLAYER_SOURCES[0];
  const path = type === 'movie' ? `movie/${id}` : `tv/${id}/${season}/${episode}`;
  return `${source.baseUrl}/${path}?autoPlay=true`;
}
