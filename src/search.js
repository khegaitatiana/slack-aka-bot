const fs = require('fs');
const { getEmployees } = require('./humaans');

// Fuzzy matching
function levenshtein(a, b) {
  const matrix = [];
  for (let i = 0; i <= b.length; i++) matrix[i] = [i];
  for (let j = 0; j <= a.length; j++) matrix[0][j] = j;

  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }
  return matrix[b.length][a.length];
}

function loadNicknames() {
  const path = process.env.NICKNAME_FILE_PATH || './data/nicknames.json';
  try {
    return JSON.parse(fs.readFileSync(path, 'utf-8'));
  } catch (e) {
    console.warn(`Nicknames file not found: ${path}`);
    return {};
  }
}

async function searchPerson(query) {
  const nicknames = loadNicknames();
  const employees = getEmployees();
  const tokens = query.toLowerCase().split(/\s+/).filter(t => t);

  if (!tokens.length) {
    return '❌ Please provide a search query.';
  }

  let matches = [];

  // Search each employee
  for (const emp of employees) {
    const firstName = (emp.firstName || '').toLowerCase();
    const surname = (emp.surname || '').toLowerCase();
    const position = (emp.position || '').toLowerCase();
    const location = (emp.location || '').toLowerCase();
    const dept = (emp.department || '').toLowerCase();
    const empNicknames = (nicknames[emp.firstName] || []).map(n => n.toLowerCase());

    let score = 0;

    // Score each token
    for (const token of tokens) {
      if (firstName.includes(token)) score += 5;
      else if (empNicknames.some(nick => nick.includes(token))) score += 4;
      else if (surname.includes(token)) score += 3;
      else if (position.includes(token)) score += 2;
      else if (location.includes(token)) score += 2;
      else if (dept.includes(token)) score += 1;
    }

    if (score > 0) {
      matches.push({ emp, score });
    }
  }

  if (!matches.length) {
    return `❌ No one found matching "${query}".`;
  }

  matches.sort((a, b) => b.score - a.score);

  // Single match
  if (matches.length === 1) {
    return formatCard(matches[0].emp, nicknames);
  }

  // Multiple matches — return all
  let response = `Found ${matches.length} people:\n\n`;
  matches.forEach((m, i) => {
    const e = m.emp;
    response += `${i + 1}. *${e.firstName} ${e.surname}* — ${e.position}, ${e.location}`;
    if (e.slackHandle) response += ` <@${e.slackHandle}>`;
    response += '\n';
  });
  return response;
}

function formatCard(emp, nicknames) {
  let card = `👤 *${emp.firstName} ${emp.surname}*\n`;

  const empNicknames = nicknames[emp.firstName] || [];
  if (empNicknames.length) {
    card += `   Known as: ${empNicknames.join(', ')}\n`;
  }

  card += `   💼 ${emp.position}`;
  if (emp.department) card += ` · ${emp.department}`;
  card += '\n';

  card += `   📍 ${emp.location}\n`;

  if (emp.timezone) card += `   🕐 ${emp.timezone}\n`;

  if (emp.slackHandle) {
    card += `   👉 <@${emp.slackHandle}>\n`;
  } else {
    card += `   ⚠️ Not in Slack yet\n`;
  }

  return card;
}

module.exports = { searchPerson };
