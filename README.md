# Bot codenamed "waterbottle"

This bot is designed to be part of the test harness for Direct Line Streaming Extensions.

## Bumping botframework-streaming-extensions and botbuilder-streaming-extensions

1. Obtain the tarball for both `botframework-streaming-extensions` and `botbuilder-streaming-extensions`.
1. Clone this repository
   1. `git clone https://github.com/compulim/botframework-waterbottle.git`
   1. `npm ci`
1. Drop them to `/external` folder, preferably to have a traceable committish
1. At project root, run `npm install external\botbuilder-streaming-extensions-0.0.1-c217757.tgz external\botframework-streaming-extensions-0.0.1-c217757.tgz --save`
1. Commit and push your changes
   - We deploy it to Azure using Project Kudu, it should appears on the production bot in about 3-5 minutes
1. Browse to https://webchat-waterbottle.azurewebsites.net, it should list the latest dependencies
