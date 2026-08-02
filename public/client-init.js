if (window.location.hostname === 'movies.xtra.wtf') {
  const tracker = document.createElement('script');
  tracker.defer = true;
  tracker.src = '/app-data/script.js';
  tracker.dataset.websiteId = 'f8f3f698-c0f1-4700-8887-1bce37cded37';
  tracker.dataset.hostUrl = '/app-data';
  tracker.dataset.domains = 'movies.xtra.wtf';
  tracker.dataset.performance = 'true';
  document.head.appendChild(tracker);
}
