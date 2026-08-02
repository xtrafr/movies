export const PLAYER_SOURCES = [
  { id: 'apiplayer', label: 'APIPlayer', baseUrl: 'https://apiplayer.ru', pathPrefix: 'embed', supportsEvents: true },
  { id: 'screenscape', label: 'ScreenScape', baseUrl: 'https://flix.screenscape.me/embed', urlStyle: 'query' },
  { id: 'vidfast', label: 'VidFast', baseUrl: 'https://vidfast.pro', pathPrefix: '' },
  { id: 'vidlink', label: 'VidLink', baseUrl: 'https://vidlink.pro', pathPrefix: '', supportsEvents: true },
  { id: 'vidsrc', label: 'VidSrc', baseUrl: 'https://vidsrc.ru', pathPrefix: '', supportsEvents: true },
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
  } else {
    const prefix = source.pathPrefix ? `${source.pathPrefix}/` : '';
    url = new URL(`${source.baseUrl}/${prefix}${path}`);
  }

  if (source.id === 'vidfast') {
    url.searchParams.set('autoPlay', 'true');
    if (type === 'tv') {
      url.searchParams.set('nextButton', 'false');
      url.searchParams.set('autoNext', 'false');
    }
  } else if (source.id === 'vidlink') {
    url.searchParams.set('autoplay', 'true');
    url.searchParams.set('nextbutton', 'false');
  } else if (source.id === 'vidsrc') {
    url.searchParams.set('autoplay', 'true');
    url.searchParams.set('colour', '6366f1');
    url.searchParams.set('pausescreen', 'false');
    if (type === 'tv') url.searchParams.set('autonextepisode', 'false');
  } else if (source.id === 'screenscape') {
    url.searchParams.set('autoplay', 'true');
    url.searchParams.set('lan', subtitleLanguage);
  } else if (source.id === 'apiplayer') {
    url.searchParams.set('autoplay', '1');
    url.searchParams.set('resume', '0');
    url.searchParams.set('lang', subtitleLanguage);
  }

  if (type === 'tv' && ['apiplayer', 'screenscape'].includes(source.id)) url.searchParams.set('autonext', '1');

  if (startAt > 0) {
    const progressParameter = ['screenscape', 'vidfast'].includes(source.id) ? 'progress' : 'startAt';
    url.searchParams.set(progressParameter, String(Math.floor(startAt)));
  }
  return url.toString();
}
