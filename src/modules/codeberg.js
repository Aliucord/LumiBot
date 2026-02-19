const { parseCodebergUrl, fetchCodebergContent, getLines } = require('../utils/codeberg');

module.exports = {
  name: 'codeberg',
  execute(client) {
    client.on('messageCreate', async (message) => {
      if (message.author.bot) return;

      // Extract all potential Codeberg links from the message
      const regex = /https:\/\/codeberg\.org\/[^/]+\/[^/]+\/src\/(?:branch|commit)\/[^/]+\/[^#\s]+(?:#L\d+(?:-L?\d+)?)?/g;
      const matches = message.content.match(regex);

      if (!matches) return;

      for (const url of matches) {
        const parsed = parseCodebergUrl(url);
        
        // Only auto-send if there's a line fragment
        if (parsed && parsed.startLine !== null) {
          try {
            const content = await fetchCodebergContent(parsed.owner, parsed.repo, parsed.ref, parsed.path);
            if (!content) continue;

            const snippet = getLines(content, parsed.startLine, parsed.endLine);
            const ext = parsed.path.split('.').pop();
            
            const header = `**${parsed.owner}/${parsed.repo}** - \`${parsed.path}\`${parsed.startLine ? ` (Lines ${parsed.startLine}${parsed.endLine !== parsed.startLine ? `-${parsed.endLine}` : ''})` : ''}`;
            
            // Limit snippet length for Discord
            const maxCodeLength = 1900;
            const codeBlock = `\`\`\`${ext}\n${snippet.length > maxCodeLength ? snippet.slice(0, maxCodeLength) + '\n... (truncated)' : snippet}\n\`\`\``;
            
            await message.channel.send(`${header}\n${codeBlock}`);
          } catch (err) {
            console.error('Codeberg auto-fetch error:', err);
          }
        }
      }
    });

    console.log('Codeberg module initialized');
  }
};
