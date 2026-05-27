require('dotenv').config();
const { WebClient } = require('@slack/web-api');
const { syncHumaans } = require('./humaans');
const { searchPerson } = require('./search');

async function postToChannel(text) {
  const token = process.env.SLACK_USER_TOKEN;
  const channel = process.env.SLACK_CHANNEL_ID;
  if (!token || !channel) return false;

  const client = new WebClient(token);
  await client.chat.postMessage({ channel, text });
  console.log(`📨 Posted to channel ${channel}`);
  return true;
}

(async () => {
  const args = process.argv.slice(2);
  const post = args.includes('--post');
  const query = args.filter(a => a !== '--post').join(' ').trim();

  if (!query) {
    console.error('Usage: npm run search -- "<query>" [--post]');
    console.error('Example: npm run search -- "Sasha designer"');
    console.error('         npm run search -- "Sasha designer" --post');
    process.exit(1);
  }

  await syncHumaans();
  const result = await searchPerson(query);
  console.log('\n' + result + '\n');

  if (post) {
    try {
      const sent = await postToChannel(result);
      if (!sent) console.warn('⚠️  --post requested but SLACK_USER_TOKEN or SLACK_CHANNEL_ID missing');
    } catch (err) {
      console.error('❌ Post failed:', err.data?.error || err.message);
    }
  }
})();
