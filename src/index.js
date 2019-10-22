import '@babel/polyfill';
import 'dotenv/config';

import { BotFrameworkAdapter } from 'botbuilder';
// import { BotFrameworkStreamingAdapter } from 'botbuilder-streaming-extensions';
import { join } from 'path';
import { MicrosoftAppCredentials } from 'botframework-connector';
import prettyMs from 'pretty-ms';
import restify from 'restify';

import Bot from './Bot';
import connectAdapterToProxy from './connectAdapterToProxy';
import generateDirectLineToken from './generateDirectLineToken';
import generateSpeechServicesToken from './generateSpeechServicesToken';

import packageJSON from '../package.json';

// Create server
const server = restify.createServer({ handleUpgrades: true });

const {
  DirectLineExtensionKey: DIRECT_LINE_EXTENSION_KEY,
  // DIRECTLINE_EXTENSION_VERSION,
  DIRECT_LINE_SPEECH_TOKEN,
  DIRECT_LINE_TOKEN,
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

const TRUSTED_ORIGIN_PATTERNS = [
  /^https?:\/\/localhost(:\d+)?$/,
  /^https:\/\/compulim.github.io$/,
  /^https:\/\/microsoft.github.io$/,
];

let streamingExtensionsType = false;

async function main() {
  server.use(restify.plugins.queryParser());

  MicrosoftAppCredentials.trustServiceUrl('https://api.scratch.botframework.com');
  MicrosoftAppCredentials.trustServiceUrl('https://state.scratch.botframework.com');
  MicrosoftAppCredentials.trustServiceUrl('https://token.scratch.botframework.com');

  MicrosoftAppCredentials.trustServiceUrl('https://api.ppe.botframework.com');
  MicrosoftAppCredentials.trustServiceUrl('https://state.ppe.botframework.com');
  MicrosoftAppCredentials.trustServiceUrl('https://token.ppe.botframework.com');

  const up = Date.now();

  server.pre((req, res, next) => {
    // CORS is also served by Restify serveStatic plugin
    if (!/^\/public(\/|$)/.test(req.url)) {
      const origin = req.header('origin');

      if (origin && !TRUSTED_ORIGIN_PATTERNS.some(pattern => pattern.test(origin))) {
        res.status(403);

        return res.end();
      }

      res.header('access-control-allow-origin', origin);
      res.header('access-control-allow-credentials', 'true');

      const accessControlRequestHeaders = req.header('access-control-request-headers');
      const accessControlRequestMethod = req.header('access-control-request-method');

      accessControlRequestHeaders && res.header('access-control-allow-headers', accessControlRequestHeaders);
      accessControlRequestMethod && res.header('access-control-allow-methods', accessControlRequestMethod || 'GET');
    }

    next();
  });

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
        dependencies: packageJSON.dependencies,
        streamingExtensionsType,
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
      res.json(await generateDirectLineToken(DIRECT_LINE_TOKEN));
    } catch ({ message }) {
      res.status(500);
      res.json({ message });
    }
  });

  server.get('/token/directlinespeech', async (req, res) => {
    try {
      res.json(await generateDirectLineToken(DIRECT_LINE_SPEECH_TOKEN));
    } catch ({ message }) {
      res.status(500);
      res.json({ message });
    }
  });

  server.get('/token/directlinestreamingextensions', async (_, res) => {
    if (WEBSITE_HOSTNAME) {
      try {
        res.json(await generateDirectLineToken(DIRECT_LINE_TOKEN, `https://${ WEBSITE_HOSTNAME }/.bot/v3/directline`));
      } catch ({ message }) {
        res.status(500);
        res.json({ message });
      }
    } else {
      res.status(500);
      res.json({ message: 'Please specify WEBSITE_HOSTNAME environment variable.' });
    }
  });

  server.get('/token/speechservices', async (req, res) => {
    try {
      res.json(await generateSpeechServicesToken());
    } catch ({ message }) {
      res.status(500);
      res.json({ message });
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
  // const streamingAdapter = new BotFrameworkStreamingAdapter(bot);

  server.post('/api/messages', (req, res) => {
    legacyAdapter.processActivity(req, res, context => bot.run(context));
  });

  // This endpoint is for Direct Line Speech channel
  server.get('/api/messages', (req, res) => {
    console.log(`GET /api/messages(isUpgradeRequest=${ req.isUpgradeRequest() })`);

    if (req.isUpgradeRequest()) {
      legacyAdapter.useWebSocket(req, res, bot);
    }
  });

  // Checks if running under Azure
  if (DIRECT_LINE_EXTENSION_KEY) {
  // if (DIRECTLINE_EXTENSION_VERSION) {
    console.log('Running with streaming extension running via Direct Line ASE.');
    await legacyAdapter.useNamedPipe(bot);
    streamingExtensionsType = 'named pipe';
  } else {
    console.log('Running with streaming extension running via proxy.');
    connectAdapterToProxy(legacyAdapter);
    streamingExtensionsType = 'web socket to proxy';
  }

  server.listen(PORT, () => console.log(`${ server.name } now listening to port ${ PORT }`));
}

main().catch(err => console.log(err));
