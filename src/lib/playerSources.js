export const PLAYER_SOURCES = [
  { id: 'screenscape', label: 'ScreenScape', baseUrl: 'https://flix.screenscape.me/embed', urlStyle: 'query', sandboxCompatible: true },
  { id: 'apiplayer', label: 'APIPlayer', baseUrl: 'https://apiplayer.ru', pathPrefix: 'embed', sandboxCompatible: true, supportsEvents: true },
  { id: 'moviesapi', label: 'MoviesAPI', baseUrl: 'https://moviesapi.to', pathPrefix: '', sandboxCompatible: true },
  { id: 'embedapi', label: 'EmbedAPI', baseUrl: 'https://player.embed-api.stream/', urlStyle: 'query', sandboxCompatible: true },
];

export function buildPlayerUrl({ serverId, type, id, season = 1, episode = 1, startAt = 0, subtitleLanguage = 'en' }) {
  const source = PLAYER_SOURCES.find((candidate) => candidate.id === serverId) || PLAYER_SOURCES[0];
  const path = type === 'movie' ? `movie/${id}` : `tv/${id}/${season}/${episode}`;
  let url;
  if (source.id === 'screenscape') {
    url = new URL(source.baseUrl);
    url.searchParams.set('tmdb', String(id));
    url.searchParams.set('type', type);
    if (type === 'tv') {
      url.searchParams.set('s', String(season));
      url.searchParams.set('e', String(episode));
    }
  } else if (source.id === 'embedapi') {
    url = new URL(source.baseUrl);
    url.searchParams.set('id', String(id));
    if (type === 'movie') url.searchParams.set('type', 'movie');
    else {
      url.searchParams.set('s', String(season));
      url.searchParams.set('e', String(episode));
    }
  } else {
    const prefix = source.pathPrefix ? `${source.pathPrefix}/` : '';
    url = new URL(`${source.baseUrl}/${prefix}${path}`);
  }

  if (source.id === 'moviesapi') {
    url.searchParams.set('autoplay', '1');
  } else if (source.id === 'screenscape') {
    url.searchParams.set('autoplay', 'true');
    url.searchParams.set('lan', subtitleLanguage);
  } else if (source.id === 'apiplayer') {
    url.searchParams.set('autoplay', '1');
    url.searchParams.set('resume', '0');
    url.searchParams.set('lang', subtitleLanguage);
  }

  if (type === 'tv') url.searchParams.set('autonext', '1');

  if (startAt > 0) {
    url.searchParams.set(source.id === 'screenscape' ? 'progress' : 'startAt', String(Math.floor(startAt)));
  }
  return url.toString();
}
