const { WebClient } = require('@slack/web-api');

let emailToId = new Map();

async function syncSlackUsers() {
  const client = new WebClient(process.env.SLACK_BOT_TOKEN);
  const map = new Map();
  let cursor;
  let pages = 0;

  do {
    const res = await client.users.list({ limit: 200, cursor });
    for (const u of res.members || []) {
      if (u.deleted || u.is_bot || u.id === 'USLACKBOT') continue;
      const email = u.profile?.email;
      if (email) map.set(email.toLowerCase(), u.id);
    }
    cursor = res.response_metadata?.next_cursor || undefined;
    pages++;
  } while (cursor);

  emailToId = map;
  console.log(`✅ Synced ${map.size} Slack users (${pages} page${pages === 1 ? '' : 's'})`);
  return map;
}

function getSlackId(email) {
  if (!email) return null;
  return emailToId.get(email.toLowerCase()) || null;
}

module.exports = { syncSlackUsers, getSlackId };
