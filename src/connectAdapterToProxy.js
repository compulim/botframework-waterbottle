import { NodeWebSocket } from 'botframework-streaming-extensions';
import WebSocket from 'ws';

export default function connectAdapterToProxy(adapter, urlString = 'https://webchat-mockbot-proxy.azurewebsites.net/') {
  return new Promise((resolve, reject) => {
    const socket = new WebSocket(urlString);
    const originalSend = socket.send.bind(socket);

    socket.send = buffer => {
      return originalSend(buffer);
    }

    socket.on('open', async () => {
      console.log(`Connected to proxy at ${ urlString }.`);
      socket.send();
      await adapter.startWebSocket(new NodeWebSocket(socket));
      resolve();
    });

    socket.on('message', buffer => {
      socket.emit('binary', buffer);
    });

    socket.on('error', reject);
  });
}
