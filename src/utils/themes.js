const { THEMES_URL } = require('./serverConfig');

const CACHE_DURATION = 15 * 60 * 1000; // 15 minutes

let cachedThemes = [];
let cacheTimestamp = 0;

function clearThemeCache() {
  cachedThemes = [];
  cacheTimestamp = 0;
}

const FETCH_CONCURRENCY = 10;

let pendingFetch = null;

// Themer only offers "Install" for raw GitHub/GitLab links
function safeDecode(str) {
  try {
    return decodeURIComponent(str);
  } catch {
    return str;
  }
}

// Some index paths are already percent-encoded, so decode first to avoid double-encoding
function encodeSegment(segment) {
  return encodeURIComponent(safeDecode(segment));
}

function buildRawUrl(host, owner, repo, branch, path) {
  const encodedPath = path.split('/').map(encodeSegment).join('/');
  if (host === 'gl') {
    return `https://gitlab.com/${owner}/${repo}/-/raw/${branch}/${encodedPath}.json`;
  }
  return `https://raw.githubusercontent.com/${owner}/${repo}/${branch}/${encodedPath}.json`;
}

// The index is { host: { owner: { "repo/branch": [path, ...] } } }
function parseIndex(index) {
  const entries = [];
  for (const [host, owners] of Object.entries(index)) {
    for (const [owner, repos] of Object.entries(owners)) {
      for (const [repoBranch, paths] of Object.entries(repos)) {
        const [repo, branch] = repoBranch.split('/');
        for (const path of paths) {
          entries.push({
            owner,
            url: buildRawUrl(host, owner, repo, branch, path),
            repoUrl: host === 'gl' ? `https://gitlab.com/${owner}/${repo}` : `https://github.com/${owner}/${repo}`,
            filename: safeDecode(path.split('/').pop())
          });
        }
      }
    }
  }
  return entries;
}

// Reads name/version/author from the theme's own manifest.
// Returns null if the theme file is gone (404), so dead themes are left out.
async function loadTheme(entry) {
  const fallback = {
    name: entry.filename,
    version: '',
    author: entry.owner,
    url: entry.url,
    repoUrl: entry.repoUrl,
    filename: `${entry.filename}.json`
  };

  try {
    const response = await fetch(entry.url);
    if (response.status === 404) return null;
    if (!response.ok) return fallback;

    const manifest = (await response.json()).manifest || {};
    return {
      ...fallback,
      name: manifest.name || fallback.name,
      version: manifest.version || '',
      author: manifest.author || fallback.author
    };
  } catch {
    return fallback;
  }
}

async function loadAllThemes() {
  const response = await fetch(THEMES_URL);
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }

  const entries = parseIndex(await response.json());
  const results = new Array(entries.length);
  let next = 0;

  // Limited concurrency so GitHub/GitLab don't rate limit us
  async function worker() {
    while (next < entries.length) {
      const i = next++;
      results[i] = await loadTheme(entries[i]);
    }
  }
  await Promise.all(Array.from({ length: FETCH_CONCURRENCY }, worker));

  return results
    .filter(Boolean)
    .sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }));
}

async function fetchThemes() {
  const now = Date.now();
  if (cachedThemes.length > 0 && (now - cacheTimestamp) < CACHE_DURATION) {
    return cachedThemes;
  }

  // Share one in-flight load between callers
  if (!pendingFetch) {
    pendingFetch = loadAllThemes()
      .then(themes => {
        cachedThemes = themes;
        cacheTimestamp = Date.now();
        console.log(`Fetched ${themes.length} themes`);
        return themes;
      })
      .catch(err => {
        console.error('Error fetching themes:', err);
        return cachedThemes;
      })
      .finally(() => {
        pendingFetch = null;
      });
  }
  return pendingFetch;
}

async function initializeThemeCache() {
  console.log('Initializing theme cache...');
  await fetchThemes();
}

function filterThemes(themes, search, author) {
  let filtered = themes;

  if (author) {
    const authorLower = author.toLowerCase();
    filtered = filtered.filter(theme =>
      theme.author.toLowerCase().includes(authorLower)
    );
  }

  if (search) {
    const searchLower = search.toLowerCase();
    filtered = filtered.filter(theme =>
      theme.name.toLowerCase().includes(searchLower)
    );
  }

  return filtered;
}

function escapeMarkdown(text) {
  return text.replace(/[*_~`[\]()#<>|\\-]/g, '\\$&');
}

function formatThemeLine(theme) {
  // Parentheses in names and links break Discord's markdown links
  const name = theme.name.replace(/[()]/g, '').trim().replace(/[[\]]/g, '\\$&');
  const url = theme.url.replace(/[()]/g, c => (c === '(' ? '%28' : '%29'));

  let smallText = '';
  if (theme.version) {
    smallText += `v${escapeMarkdown(theme.version)} `;
  }
  smallText += `by ${escapeMarkdown(theme.author)}`;

  return `[${name}](<${url}>)\n-# ${smallText}`;
}

function getUniqueThemeAuthors(themes) {
  const authorsSet = new Set();
  themes.forEach(t => {
    if (t.author && t.author !== 'Unknown') {
      authorsSet.add(t.author.trim());
    }
  });
  return Array.from(authorsSet).sort();
}

module.exports = {
  fetchThemes,
  filterThemes,
  formatThemeLine,
  getUniqueThemeAuthors,
  initializeThemeCache,
  clearThemeCache
};
