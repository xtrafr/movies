const COMPLETION_EVENTS = /^(ended|end|finished|finish|complete|completed|autonext|auto-next|next-episode|next_episode|video-ended|playback-ended)$/i;

function finiteNumber(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function collectPayloads(data) {
  if (!data || typeof data !== 'object') return [];
  const payloads = [data];
  for (const key of ['data', 'payload', 'detail', 'progress', 'state']) {
    if (data[key] && typeof data[key] === 'object') payloads.push(data[key]);
  }
  return payloads;
}

function firstNumber(payloads, keys) {
  for (const payload of payloads) {
    for (const key of keys) {
      const value = finiteNumber(payload[key]);
      if (value !== undefined) return value;
    }
  }
  return undefined;
}

function normalizeEventName(value) {
  if (typeof value !== 'string') return undefined;
  const normalized = value.trim().toLowerCase().replace(/[\s_]+/g, '-');
  return COMPLETION_EVENTS.test(normalized) ? (normalized === 'autonext' ? 'autonext' : 'ended') : normalized;
}

export function normalizePlayerEvent(data) {
  if (typeof data === 'string') {
    try {
      return normalizePlayerEvent(JSON.parse(data));
    } catch {
      const event = normalizeEventName(data);
      return COMPLETION_EVENTS.test(event || '') ? { event } : null;
    }
  }

  if (!data || typeof data !== 'object') return null;
  if (data.type === 'PLAYER_NEXT_EPISODE') return { event: 'ended' };

  const root = data.type === 'PLAYER_EVENT' && data.data && typeof data.data === 'object'
    ? data.data
    : data;
  const payloads = collectPayloads(root);
  const eventCandidate = [root.event, root.action, root.name, root.status, root.type]
    .find((value) => typeof value === 'string' && !/^mplayer$/i.test(value));
  const event = normalizeEventName(eventCandidate);
  const currentTime = firstNumber(payloads, [
    'currentTime', 'position', 'current', 'time', 'progressSeconds', 'watchedSeconds', 'seconds',
  ]);
  const duration = firstNumber(payloads, ['duration', 'durationSeconds', 'totalDuration', 'length']);
  const percent = firstNumber(payloads, ['percent', 'percentage', 'progressPercent']);

  if (!event && currentTime === undefined && duration === undefined && percent === undefined) return null;
  return { event, currentTime, duration, percent };
}

export function shouldAdvanceEpisode(playerEvent) {
  if (!playerEvent) return false;
  if (playerEvent.event && COMPLETION_EVENTS.test(playerEvent.event)) return true;

  const currentTime = finiteNumber(playerEvent.currentTime);
  const duration = finiteNumber(playerEvent.duration);
  const percent = finiteNumber(playerEvent.percent);

  if (percent !== undefined && percent >= 99.5) return true;
  if (currentTime === undefined || duration === undefined || duration <= 0) return false;

  const remaining = duration - currentTime;
  return currentTime / duration >= 0.985 && remaining <= 3;
}

export function getNextEpisodeSelection({ seasons = [], episodes = [], activeSeason, currentEpisode }) {
  const nextEpisode = episodes
    .filter((episode) => Number(episode.episode_number) > Number(currentEpisode))
    .sort((first, second) => Number(first.episode_number) - Number(second.episode_number))[0];

  if (nextEpisode) {
    return {
      season: Number(activeSeason),
      episode: Number(nextEpisode.episode_number),
    };
  }

  const nextSeason = seasons
    .filter((season) => Number(season.season_number) > Number(activeSeason))
    .sort((first, second) => Number(first.season_number) - Number(second.season_number))[0];

  if (!nextSeason) return null;
  return { season: Number(nextSeason.season_number), episode: 1 };
}
