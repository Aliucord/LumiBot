const { PLUGINS_URL } = require('./serverConfig');

const CACHE_DURATION = 12 * 60 * 60 * 1000; // 12 hours

let cachedPlugins = [];
let cacheTimestamp = 0;

function clearPluginCache() {
  cachedPlugins = [];
  cacheTimestamp = 0;
}

function normalizePluginUrl(url) {
  // Handle jsDelivr with @refs/heads
  if (url.includes("cdn.jsdelivr.net") && url.includes("@refs/heads/")) {
    return url
      .replace("cdn.jsdelivr.net/gh/", "github.com/")
      .replace("@refs/heads/", "/raw/");
  }

  // Handle jsDelivr with @branch (without refs/heads)
  if (url.includes("cdn.jsdelivr.net/gh/")) {
    return url
      .replace("cdn.jsdelivr.net/gh/", "github.com/")
      .replace(/@([^/]+)\//, "/raw/$1/");
  }

  // Handle GitHub refs/heads
  if (url.includes("/raw/refs/heads/")) {
    return url.replace("/raw/refs/heads/", "/raw/");
  }

  // Handle raw.githubusercontent refs/heads
  if (url.includes("raw.githubusercontent.com") && url.includes("/refs/heads/")) {
    return url.replace("/refs/heads/", "/");
  }

  return url;
}

async function fetchPlugins() {
  const now = Date.now();
  if (cachedPlugins.length > 0 && (now - cacheTimestamp) < CACHE_DURATION) {
    return cachedPlugins;
  }

  try {
    const response = await fetch(PLUGINS_URL);
    if (!response.ok) {
      console.error(`Error fetching manifest: HTTP ${response.status}`);
      return cachedPlugins;
    }

    const data = await response.json();
    const plugins = [];

    if (Array.isArray(data)) {
      for (const plugin of data) {
        if (plugin.name && plugin.url) {
          let authors = 'Unknown';
          if (Array.isArray(plugin.authors)) {
            authors = plugin.authors.map(a => {
              if (typeof a === 'string') return a;
              if (a && typeof a === 'object' && a.name) return a.name;
              return 'Unknown';
            }).join(', ');
          }
          plugins.push({
            name: plugin.name,
            description: plugin.description || 'No description',
            url: normalizePluginUrl(plugin.url),
            version: plugin.version || '',
            authors: authors,
            changelog: plugin.changelog || ''
          });
        }
      }
    }

    cachedPlugins = plugins;
    cacheTimestamp = now;
    console.log(`Fetched ${plugins.length} plugins`);
    return plugins;
  } catch (err) {
    console.error('Error fetching plugins from manifest:', err);
    return cachedPlugins;
  }
}

async function initializePluginCache() {
  console.log('Initializing plugin cache...');
  await fetchPlugins();
}

function filterPlugins(plugins, search, author) {
  let filtered = plugins;

  if (author) {
    const authorLower = author.toLowerCase();
    filtered = filtered.filter(plugin =>
      plugin.authors.toLowerCase().includes(authorLower)
    );
  }

  if (search) {
    const searchLower = search.toLowerCase();
    filtered = filtered.filter(plugin =>
      plugin.name.toLowerCase().includes(searchLower) ||
      plugin.description.toLowerCase().includes(searchLower)
    );
  }

  return filtered;
}

function escapeMarkdown(text) {
  return text.replace(/[*_~`[\]()]/g, '\\$&');
}

function formatPluginLine(plugin) {
  let text = `[${plugin.name}](<${plugin.url}>)\n`;
  text += escapeMarkdown(plugin.description);
  if (plugin.authors) {
    text += ` - ${escapeMarkdown(plugin.authors)}`;
  }
  return text;
}

function getUniquePluginAuthors(plugins) {
  const authorsSet = new Set();
  plugins.forEach(p => {
    if (p.authors && p.authors !== 'Unknown') {
      p.authors.split(', ').forEach(author => authorsSet.add(author.trim()));
    }
  });
  return Array.from(authorsSet).sort();
}

module.exports = {
  fetchPlugins,
  filterPlugins,
  formatPluginLine,
  getUniquePluginAuthors,
  initializePluginCache,
  clearPluginCache
};
