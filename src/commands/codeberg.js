const { parseCodebergUrl, fetchCodebergContent, getLines } = require('../utils/codeberg');

module.exports = {
  data: {
    name: 'codeberg',
    description: 'Fetch and display code from Codeberg links',
    toJSON: () => ({ name: 'codeberg', description: 'Fetch and display code from Codeberg links' })
  },
  async executePrefix(message, args) {
    // If the module already handled this message (contains #L), we don't need to do anything
    if (message.content.includes('#L')) return;

    const url = args[0];
    if (!url) return message.reply('Please provide a Codeberg link.');

    const parsed = parseCodebergUrl(url);
    if (!parsed) return message.reply('Invalid Codeberg link format.');

    try {
      const content = await fetchCodebergContent(parsed.owner, parsed.repo, parsed.ref, parsed.path);
      if (!content) return message.reply('Could not fetch file content.');

      const snippet = getLines(content, parsed.startLine, parsed.endLine);
      const ext = parsed.path.split('.').pop();
      
      const header = `**${parsed.owner}/${parsed.repo}** - \`${parsed.path}\`${parsed.startLine ? ` (Lines ${parsed.startLine}${parsed.endLine !== parsed.startLine ? `-${parsed.endLine}` : ''})` : ''}`;
      
      const maxCodeLength = 1900;
      const codeBlock = `\`\`\`${ext}\n${snippet.length > maxCodeLength ? snippet.slice(0, maxCodeLength) + '\n... (truncated)' : snippet}\n\`\`\``;
      
      await message.channel.send(`${header}\n${codeBlock}`);
    } catch (err) {
      console.error('Codeberg fetch error:', err);
      await message.reply('An error occurred while fetching the code.');
    }
  }
};
