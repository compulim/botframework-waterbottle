import '@babel/polyfill';
import 'dotenv/config';

import { BotFrameworkAdapter } from 'botbuilder';
import { BotFrameworkStreamingAdapter } from 'botbuilder-streaming-extensions';
import { MicrosoftAppCredentials } from 'botframework-connector';
import prettyMs from 'pretty-ms';
import restify from 'restify';

import Bot from './Bot';
import connectAdapterToProxy from './connectAdapterToProxy';

// Create server
const server = restify.createServer({ handleUpgrades: true });

const {
  DIRECTLINE_EXTENSION_VERSION,
  MICROSOFT_APP_ID,
  MICROSOFT_APP_PASSWORD,
  OAUTH_ENDPOINT,
  OPENID_METADATA,
  PORT = 3978
} = process.env;

const ADAPTER_SETTINGS = {
  appId: MICROSOFT_APP_ID,
  appPassword: MICROSOFT_APP_PASSWORD,
  oAuthEndpoint: OAUTH_ENDPOINT,
  openIdMetadata: OPENID_METADATA
};

function main() {
  server.use(restify.plugins.queryParser());

  MicrosoftAppCredentials.trustServiceUrl('https://api.scratch.botframework.com');
  MicrosoftAppCredentials.trustServiceUrl('https://state.scratch.botframework.com');
  MicrosoftAppCredentials.trustServiceUrl('https://token.scratch.botframework.com');

  MicrosoftAppCredentials.trustServiceUrl('https://api.ppe.botframework.com');
  MicrosoftAppCredentials.trustServiceUrl('https://state.ppe.botframework.com');
  MicrosoftAppCredentials.trustServiceUrl('https://token.ppe.botframework.com');

  const up = Date.now();

  server.get('/', async (_, res) => {
    const message = `WaterBottle is up since ${ prettyMs(Date.now() - up) } ago.`;
    const separator = new Array(message.length).fill('-').join('');

    res.set('Content-Type', 'text/plain');
    res.send(JSON.stringify({
      human: [
        separator,
        message,
        separator
      ],
      computer: {
        up
      }
    }, null, 2));
  });

  server.get('/health.txt', async (_, res) => {
    res.set('Content-Type', 'text/plain');
    res.send('OK');
  });

  server.get('/ready.txt', async (_, res) => {
    res.set('Content-Type', 'text/plain');
    res.send('OK');
  });

  const bot = new Bot();
  const legacyAdapter = new BotFrameworkAdapter(ADAPTER_SETTINGS);

  server.post('/api/messages', (req, res) => {
    legacyAdapter.processActivity(req, res, context => bot.run(context));
  });

  const streamingAdapter = new BotFrameworkStreamingAdapter(bot);

  // Checks if running under Azure
  if (DIRECTLINE_EXTENSION_VERSION) {
    console.log('Running with streaming extension running via Direct Line ASE.');
    streamingAdapter.connectNamedPipe();
  } else {
    console.log('Running with streaming extension running via proxy.');
    connectAdapterToProxy(streamingAdapter);
  }

  server.listen(PORT, () => console.log(`${ server.name } now listening to port ${ PORT }`));
}

main();
