import { ActivityHandler } from 'botbuilder';

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

      await context.sendActivity({
        attachments: [{
          content: {
            activity: {
              ...(activity.text ? { text: activity.text } : {}),
              ...(activity.value ? { value: activity.value } : {})
            },
            ...(activity.attachments ? {
              attachments: activity.attachments.map(attachment => ({
                contentType: attachment.contentType
              }))
            } : {})
          },
          contentType: 'application/json'
        }]
      });

      await next();
    });

    this.onUnrecognizedActivityType(async (context, next) => {
      if (context.activity.type === 'typing') {
        await context.sendActivity({ type: 'typing' });
      }

      await next();
    });
  }
}
