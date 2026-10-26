// Aliucord data sources and channel settings
const PLUGINS_URL = 'https://plugins.aliucord.com/manifest.json';
// Theme index: { host: { owner: { "repo/branch": [path, ...] } } }
const THEMES_URL = 'https://raw.githubusercontent.com/RAutobot/themes-repo/main/themes';

const SUPPORT_HELPER_ROLE = '1397067198761144361';

// /search only works in channels where hold-to-install is supported.
// Support helpers can use all of these; everyone else only the public ones.
const SEARCH_CHANNELS = {
  plugin: ['811261298997460992', '847566769258233926', '811263527239024640'],
  theme: ['875213883776847873'] // #theme-support
};
const PUBLIC_SEARCH_CHANNELS = {
  plugin: ['811263527239024640'],
  theme: ['875213883776847873'] // #theme-support
};

module.exports = {
  PLUGINS_URL,
  THEMES_URL,
  SUPPORT_HELPER_ROLE,
  SEARCH_CHANNELS,
  PUBLIC_SEARCH_CHANNELS
};
