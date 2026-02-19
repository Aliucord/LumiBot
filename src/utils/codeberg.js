const fetch = require('node-fetch');

/**
 * Parses a Codeberg URL to extract owner, repo, branch/commit, and file path.
 * Supports line number fragments like #L1-10 or #L5.
 * @param {string} url - The Codeberg file URL.
 * @returns {Object|null} - Parsed info or null.
 */
function parseCodebergUrl(url) {
  const regex = /https:\/\/codeberg\.org\/([^/]+)\/([^/]+)\/src\/(?:branch|commit)\/([^/]+)\/([^#\s]+)(?:#L(\d+)(?:-L?(\d+))?)?/;
  const match = url.match(regex);
  if (!match) return null;

  const [, owner, repo, ref, path, startLine, endLine] = match;
  return {
    owner,
    repo,
    ref,
    path: decodeURIComponent(path),
    startLine: startLine ? parseInt(startLine) : null,
    endLine: endLine ? parseInt(endLine) : (startLine ? parseInt(startLine) : null)
  };
}

/**
 * Fetches the raw content of a file from Codeberg.
 */
async function fetchCodebergContent(owner, repo, ref, path) {
  const rawUrl = `https://codeberg.org/${owner}/${repo}/raw/branch/${ref}/${path}`;
  const response = await fetch(rawUrl);
  if (!response.ok) {
    // Try commit ref if branch fails
    const rawUrlCommit = `https://codeberg.org/${owner}/${repo}/raw/commit/${ref}/${path}`;
    const respCommit = await fetch(rawUrlCommit);
    if (!respCommit.ok) return null;
    return await respCommit.text();
  }
  return await response.text();
}

/**
 * Extracts specific lines from text.
 */
function getLines(text, start, end) {
  const lines = text.split('\n');
  if (!start) return text;
  return lines.slice(start - 1, end).join('\n');
}

module.exports = {
  parseCodebergUrl,
  fetchCodebergContent,
  getLines
};
