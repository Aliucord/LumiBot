const { AttachmentBuilder } = require('discord.js');

function parseInterval(intervalStr) {
  const match = intervalStr.match(/^(\d+)(m|h|d)$/i);
  if (!match) return null;
  
  const value = parseInt(match[1]);
  const unit = match[2].toLowerCase();
  
  const multipliers = {
    'm': 60 * 1000,
    'h': 60 * 60 * 1000,
    'd': 24 * 60 * 60 * 1000
  };
  
  return value * multipliers[unit];
}

function formatInterval(intervalStr) {
  const units = { m: 'minute(s)', h: 'hour(s)', d: 'day(s)' };
  const match = intervalStr.match(/^(\d+)(m|h|d)$/i);
  return `${match[1]} ${units[match[2].toLowerCase()]}`;
}

module.exports = {
  parseInterval,
  formatInterval
};
