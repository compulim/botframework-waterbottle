import fetch from 'node-fetch';

import createUserId from './createUserId';

const {
  DIRECT_LINE_SECRET
} = process.env;

const DEFAULT_DOMAIN = 'https://directline.botframework.com/v3/directline';

export default async function generateDirectLineToken(domain = DEFAULT_DOMAIN) {
  if (!DIRECT_LINE_SECRET) {
    throw new Error('Please specify DIRECT_LINE_SECRET environment variable.');
  }

  const userId = createUserId();
  let res;

  res = await fetch(`${ domain }/tokens/generate`, {
    body: JSON.stringify({ User: { Id: createUserId() } }),
    headers: {
      authorization: `Bearer ${ DIRECT_LINE_SECRET }`,
      'Content-Type': 'application/json'
    },
    method: 'POST'
  });

  if (res.status === 200) {
    const json = await res.json();

    if ('error' in json) {
      throw new Error(`Direct Line service responded with ${ JSON.stringify(json.error) } while generating a new token`);
    } else {
      return {
        userId,
        ...json
      };
    }
  } else {
    throw new Error(`Direct Line service returned ${ res.status } while generating a new token`);
  }
}
