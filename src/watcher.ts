import pc from 'picocolors';
import { HmrData } from './plugins';
import { formatNormal } from './console';
import { ViteBurnerConfig } from './config';
import { createServer } from './server';
import WsManager from './ws/manager';
import WsAdapter from './ws/adapter';

export async function watch(config: ViteBurnerConfig) {
  // create ws server
  const port = config.port ?? 12525;
  console.log(formatNormal('creating WebSocket server...'));
  const wsManager = new WsManager({ port, timeout: config.timeout });
  console.log(formatNormal(`WebSocket server listening on localhost:${pc.magenta(String(port))}`));

  // create vite server
  console.log(formatNormal('creating dev server...'));
  const server = await createServer(config);
  server.config.logger.info(formatNormal('watching for file changes...'));

  const wsAdapter = new WsAdapter(wsManager, server);

  // store initial HMR datas
  let buildStarted = false;
  const initialDatas: HmrData[] = [];
  server.onHmrMessage(async (data) => {
    if (!buildStarted) {
      initialDatas.push(data);
    } else {
      await wsAdapter.handleHmrMessage(data);
    }
  });

  // init plugins
  await server.buildStart();
  buildStarted = true;

  // process initial HMR datas
  for (const data of initialDatas) {
    await wsAdapter.handleHmrMessage(data);
  }
}
