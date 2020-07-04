import generateDirectLineToken from '../utils/generateDirectLineToken';
import renewDirectLineToken from '../utils/renewDirectLineToken';
import trustedOrigin from '../trustedOrigin';

export default function getTokenForDeprecatingAPI(server) {
  const { DIRECT_LINE_SECRET, SPEECH_SERVICES_REGION, SPEECH_SERVICES_SUBSCRIPTION_KEY } = process.env;

  if (!DIRECT_LINE_SECRET) {
    throw new TypeError('Environment variable "DIRECT_LINE_SECRET" must be set.');
  } else if (!SPEECH_SERVICES_REGION) {
    throw new TypeError('Environment variable "SPEECH_SERVICES_REGION" must be set.');
  } else if (!SPEECH_SERVICES_SUBSCRIPTION_KEY) {
    throw new TypeError('Environment variable "SPEECH_SERVICES_SUBSCRIPTION_KEY" must be set.');
  }

  server.get('/token/directline', async (req, res) => {
    try {
      const origin = req.header('origin');

      if (!trustedOrigin(origin)) {
        return res.send(403, 'not trusted origin', { 'Access-Control-Allow-Origin': '*' });
      }

      const { token: refreshingToken } = req.query;

      try {
        const { token } = await (refreshingToken ? renewDirectLineToken(refreshingToken) : generateDirectLineToken(DIRECT_LINE_SECRET));

        res.sendRaw(
          JSON.stringify(
            {
              token
            },
            null,
            2
          ),
          { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' }
        );
      } catch (err) {
        res.send(500, err.message, { 'Access-Control-Allow-Origin': '*' });
      }

      if (refreshingToken) {
        console.log(`Refreshing Direct Line token for ${origin}`);
      } else {
        console.log(
          `Requesting Direct Line token for ${origin} using secret "${DIRECT_LINE_SECRET.substr(
            0,
            3
          )}...${DIRECT_LINE_SECRET.substr(-3)}"`
        );
      }
    } catch (err) {
      res.send(500, { message: err.message, stack: err.stack }, { 'Access-Control-Allow-Origin': '*' });
    }
  });

  server.get('/token/speechservices', async (req, res) => {
    try {
      if (!SPEECH_SERVICES_REGION || !SPEECH_SERVICES_SUBSCRIPTION_KEY) {
        return res.send(403, 'Cognitive Services Speech Services authorization token is unavailable.', { 'Access-Control-Allow-Origin': '*' });
      }

      const origin = req.header('origin');

      if (!trustedOrigin(origin)) {
        return res.send(403, 'not trusted origin', { 'Access-Control-Allow-Origin': '*' });
      }

      console.log(
        `Requesting Speech Services authorization token using subscription key "${SPEECH_SERVICES_SUBSCRIPTION_KEY.substr(
          0,
          3
        )}...${SPEECH_SERVICES_SUBSCRIPTION_KEY.substr(-3)}" for ${origin}`
      );

      const tokenRes = await fetch(
        `https://${SPEECH_SERVICES_REGION}.api.cognitive.microsoft.com/sts/v1.0/issueToken`,
        {
          headers: { 'Ocp-Apim-Subscription-Key': SPEECH_SERVICES_SUBSCRIPTION_KEY },
          method: 'POST'
        }
      );

      if (!tokenRes.ok) {
        return res.send(500, { 'Access-Control-Allow-Origin': '*' });
      }

      const authorizationToken = await tokenRes.text();

      res.sendRaw(
        JSON.stringify(
          {
            authorizationToken,
            region: SPEECH_SERVICES_REGION,
            token: authorizationToken
          },
          null,
          2
        ),
        {
          'Access-Control-Allow-Origin': '*',
          'Content-Type': 'application/json'
        }
      );
    } catch (err) {
      res.send(500, { message: err.message, stack: err.stack }, { 'Access-Control-Allow-Origin': '*' });
    }
  });
}
