import fetch from 'node-fetch';

const {
  SPEECH_SERVICES_REGION,
  SPEECH_SERVICES_SUBSCRIPTION_KEY
} = process.env;

export default async function generateSpeechServicesToken(region = SPEECH_SERVICES_REGION, subscriptionKey = SPEECH_SERVICES_SUBSCRIPTION_KEY) {
  if (!region) {
    throw new Error('Please specify SPEECH_SERVICES_REGION environment variable.');
  } else if (!subscriptionKey) {
    throw new Error('Please specify SPEECH_SERVICES_SUBSCRIPTION_KEY environment variable.');
  }

  const res = await fetch(`https://${ region }.api.cognitive.microsoft.com/sts/v1.0/issueToken`, {
    headers: { 'Ocp-Apim-Subscription-Key': subscriptionKey },
    method: 'POST'
  });

  if (!res.ok) {
    throw new Error(`Cognitive Services returned ${ res.status } while generating a new token`);
  }

  return {
    region,
    token: await res.text()
  };
}
