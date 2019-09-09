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
