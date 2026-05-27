const fs = require('fs');
const { WebClient } = require('@slack/web-api');

let emailToId = new Map();

function buildMap(members) {
  const map = new Map();
  for (const u of members || []) {
    if (u.deleted || u.is_bot || u.id === 'USLACKBOT') continue;
    const email = u.profile?.email;
    if (email) map.set(email.toLowerCase(), u.id);
  }
  return map;
}

function loadFromFile(path) {
  const raw = JSON.parse(fs.readFileSync(path, 'utf-8'));
  // Accept users.list ({members:[...]}), admin.users.list ({results:[...]}),
  // a bare array, or anything with a single list-valued key.
  let members;
  if (Array.isArray(raw)) {
    members = raw;
  } else {
    members = raw.members || raw.results || raw.data || raw.users;
    if (!members) {
      const listKey = Object.keys(raw).find(k => Array.isArray(raw[k]));
      members = listKey ? raw[listKey] : [];
    }
  }
  return buildMap(members);
}

async function loadFromApi() {
  const client = new WebClient(process.env.SLACK_BOT_TOKEN);
  const members = [];
  let cursor;
  let pages = 0;
  do {
    const res = await client.users.list({ limit: 200, cursor });
    members.push(...(res.members || []));
    cursor = res.response_metadata?.next_cursor || undefined;
    pages++;
  } while (cursor);
  console.log(`✅ Fetched ${members.length} Slack users from API (${pages} page${pages === 1 ? '' : 's'})`);
  return buildMap(members);
}

async function syncSlackUsers() {
  const filePath = process.env.SLACK_USERS_FILE || './data/slack_users.json';
  if (fs.existsSync(filePath)) {
    emailToId = loadFromFile(filePath);
    console.log(`✅ Loaded ${emailToId.size} Slack users from ${filePath}`);
    return emailToId;
  }

  if (!process.env.SLACK_BOT_TOKEN) {
    console.warn(`⚠️  No Slack users file at ${filePath} and no SLACK_BOT_TOKEN — Slack links disabled`);
    emailToId = new Map();
    return emailToId;
  }

  emailToId = await loadFromApi();
  return emailToId;
}

function getSlackId(email) {
  if (!email) return null;
  return emailToId.get(email.toLowerCase()) || null;
}

module.exports = { syncSlackUsers, getSlackId };
