import { ActivityHandler } from 'botbuilder';

const SSML_TEMPLATE = `<speak version="1.0" xml:lang="en-US"><voice xml:lang="en-US" name="Microsoft Server Speech Text to Speech Voice (en-US, JessaNeural)"><prosody pitch="+0%" rate="+0%" volume="+0%">$TEXT</prosody></voice></speak>`;

export default class Bot extends ActivityHandler {
  constructor() {
    super();

    this.onConversationUpdate(async (context, next) => {
      const { activity } = context;

      console.log(activity);

      await next();
    });

    this.onMessage(async (context, next) => {
      const { activity } = context;

      console.log(activity);

      const attachments = (activity.attachments || []).map(({ content, contentType, contentUrl }) => ({
        ...content ? { content } : {},
        contentType,
        ...contentUrl ? { contentUrl } : {}
      }));

      await context.sendActivity({
        attachments,
        channelData: {
          originalActivity: activity
        },
        inputHint: 'expectingInput',
        speak: SSML_TEMPLATE.replace('$TEXT', activity.text),
        text: activity.text,
        value: activity.value
      });

      await next();
    });

    this.onUnrecognizedActivityType(async (context, next) => {
      if (context.activity.type === 'typing') {
        await context.sendActivity({
          channelData: {
            originalActivity: context.activity
          },
          type: 'typing'
        });
      }

      await next();
    });
  }
}
