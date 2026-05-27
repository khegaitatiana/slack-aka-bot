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

// Match a token against a field at word-boundary level: token must be a
// prefix of some word in the field. Prevents "stefan" matching "estefany".
function matchWord(field, token) {
  if (!field) return false;
  for (const word of field.split(/[\s._\-,/()]+/)) {
    if (word && word.startsWith(token)) return true;
  }
  return false;
}

function findPeople(query) {
  const nicknames = loadNicknames();
  const employees = getEmployees();
  const tokens = query.toLowerCase().split(/\s+/).filter(t => t);
  if (!tokens.length) return { matches: [], nicknames };

  const matches = [];
  for (const emp of employees) {
    const firstName = (emp.firstName || '').toLowerCase();
    const surname = (emp.surname || '').toLowerCase();
    const position = (emp.position || '').toLowerCase();
    const location = (emp.location || '').toLowerCase();
    const dept = (emp.department || '').toLowerCase();
    const teams = (emp.teams || []).join(' ').toLowerCase();
    const slackDisplay = (emp.slackDisplayName || '').toLowerCase();
    const slackRealName = (emp.slackRealName || '').toLowerCase();
    const slackTitle = (emp.slackTitle || '').toLowerCase();
    // Look up nicknames using every plausible "formal first name" we have:
    // Humaans firstName, Slack first_name, and the first word of real_name.
    // Catches cases like Humaans "Dima" + Slack "Dmitrii" → Mitya is a known
    // nickname for Dmitrii.
    const candidateKeys = new Set();
    if (emp.firstName) candidateKeys.add(emp.firstName);
    if (emp.slackFirstName) candidateKeys.add(emp.slackFirstName);
    const realFirst = (emp.slackRealName || '').split(/\s+/)[0];
    if (realFirst) candidateKeys.add(realFirst);

    const empNicknames = [];
    for (const key of candidateKeys) {
      if (nicknames[key]) empNicknames.push(...nicknames[key].map(n => n.toLowerCase()));
    }

    let nameScore = 0;
    let refineScore = 0;
    let allTokensMatched = true;
    for (const token of tokens) {
      if (matchWord(firstName, token)) nameScore += 5;
      else if (empNicknames.some(nick => nick.startsWith(token))) nameScore += 4;
      else if (matchWord(slackDisplay, token)) nameScore += 4;
      else if (matchWord(slackRealName, token)) nameScore += 4;
      else if (matchWord(surname, token)) nameScore += 3;
      else if (matchWord(position, token)) refineScore += 2;
      else if (matchWord(slackTitle, token)) refineScore += 2;
      else if (matchWord(teams, token)) refineScore += 2;
      else if (matchWord(location, token)) refineScore += 2;
      else if (matchWord(dept, token)) refineScore += 1;
      else { allTokensMatched = false; break; }
    }

    // Every token must match somewhere AND at least one must be a name match.
    if (allTokensMatched && nameScore > 0) {
      matches.push({ emp, score: nameScore + refineScore });
    }
  }

  matches.sort((a, b) => b.score - a.score);
  return { matches, nicknames };
}

async function searchPerson(query) {
  const { matches, nicknames } = findPeople(query);

  if (!query.trim()) return '❌ Please provide a search query.';
  if (!matches.length) return `❌ No one found matching "${query}".`;

  if (matches.length === 1) return formatCard(matches[0].emp, nicknames);

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

module.exports = { searchPerson, findPeople };
