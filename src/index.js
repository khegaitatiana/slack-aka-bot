require('dotenv').config();
const { App } = require('@slack/bolt');
const { searchPerson } = require('./search');
const { syncHumaans } = require('./humaans');

const app = new App({
  token: process.env.SLACK_BOT_TOKEN,
  appToken: process.env.SLACK_APP_TOKEN,
  socketMode: true,
});

// Sync Humaans on startup
syncHumaans();
setInterval(syncHumaans, (process.env.HUMAANS_SYNC_INTERVAL || 60) * 60 * 1000);

// Handle /aka command
app.command('/aka', async ({ ack, body, say }) => {
  await ack();

  const query = body.text.trim();
  if (!query) {
    await say('Usage: `/aka [name]` e.g. `/aka Sasha designer Kyiv`');
    return;
  }

  try {
    const result = await searchPerson(query);
    await say(result);
  } catch (error) {
    console.error('Error:', error);
    await say('❌ Error searching. Check bot logs.');
  }
});

// Handle @aka mentions
app.message(async ({ message, say }) => {
  if (!message.text || !message.text.includes('<@')) return;

  const query = message.text
    .replace(/<@[A-Z0-9]+>/g, '')
    .trim();

  if (!query) return;

  try {
    const result = await searchPerson(query);
    await say(result);
  } catch (error) {
    console.error('Error:', error);
    await say('❌ Error searching. Check bot logs.');
  }
});

// Start bot
(async () => {
  await app.start();
  console.log('⚡️ Bolt app is running!');
})();
