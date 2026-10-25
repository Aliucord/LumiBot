// Aliucord data sources and channel settings
const PLUGINS_URL = 'https://plugins.aliucord.com/manifest.json';
// Theme index: { host: { owner: { "repo/branch": [path, ...] } } }
const THEMES_URL = 'https://raw.githubusercontent.com/RAutobot/themes-repo/main/themes';

// /search only works in channels where hold-to-install is supported
const SEARCH_CHANNELS = {
  plugin: ['811261298997460992', '847566769258233926', '811263527239024640'],
  theme: ['875213883776847873'] // #theme-support
};

module.exports = {
  PLUGINS_URL,
  THEMES_URL,
  SEARCH_CHANNELS
};
