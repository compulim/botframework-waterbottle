import '@babel/polyfill';
import 'dotenv/config';

import { BotFrameworkAdapter } from 'botbuilder';
import { BotFrameworkStreamingAdapter } from 'botbuilder-streaming-extensions';
import { join } from 'path';
import { MicrosoftAppCredentials } from 'botframework-connector';
import prettyMs from 'pretty-ms';
import restify from 'restify';

import Bot from './Bot';
import connectAdapterToProxy from './connectAdapterToProxy';
import generateDirectLineToken from './generateDirectLineToken';

// Create server
const server = restify.createServer({ handleUpgrades: true });

const {
  DIRECTLINE_EXTENSION_VERSION,
  MICROSOFT_APP_ID,
  MICROSOFT_APP_PASSWORD,
  OAUTH_ENDPOINT,
  OPENID_METADATA,
  PORT = 3978,
  WEBSITE_HOSTNAME = 'webchat-waterbottle'
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

  server.get('/token/directline', async (_, res) => {
    try {
      res.json(await generateDirectLineToken());
    } catch ({ message }) {
      res.status(500);
      res.json({ message });
    }
  });

  server.get('/token/directlinestreamingextensions', async (_, res) => {
    if (WEBSITE_HOSTNAME) {
      try {
        res.json(await generateDirectLineToken(`https://${ WEBSITE_HOSTNAME }/.bot/v3/directline`));
      } catch ({ message }) {
        res.status(500);
        res.json({ message });
      }
    } else {
      res.status(500);
      res.json({ message: 'Please specify WEBSITE_HOSTNAME environment variable.' });
    }
  });

  server.opts('/public/**/*', (req, res) => {
    const accessControlRequestHeaders = req.header('access-control-request-headers');
    const accessControlRequestMethods = (req.header('access-control-request-method') || '').split(/[,\s]/iu).filter(s => s.trim());
    const origin = req.header('origin');

    if (~accessControlRequestMethods.indexOf('GET')) {
      accessControlRequestHeaders && res.header('access-control-allow-headers', accessControlRequestHeaders);
      res.header('access-control-allow-origin', origin || '*');
      res.header('access-control-allow-methods', 'GET');
      res.end();
    } else {
      res.statusCode(403);
      res.end();
    }
  });

  server.get('/public/**/*', restify.plugins.serveStaticFiles(join(__dirname, '../public')));

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
