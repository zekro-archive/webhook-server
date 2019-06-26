/** @format */

import { ConfigLoader } from './config';
import yargs from 'yargs';
import logger from './logger';
import WebServer from './webserver';

function main() {
  const argv = yargs
    .command('webhook-server', 'A simple webhook server')
    .option('config', {
      alias: 'c',
      description: 'Config file',
      type: 'string',
      default: './config.yaml',
    })
    .option('port', {
      alias: 'p',
      description: 'Web server expose port (overrides config)',
      type: 'number',
    })
    .option('run-location', {
      alias: 'l',
      description:
        'Location from where scripts will be executed (overrides config)',
      type: 'string',
    })
    .help()
    .alias('help', 'h').argv;

  var config = ConfigLoader.openSync(argv.config);

  if (!config) {
    logger.error(
      `Config file not found. Default config was created at ${argv.config}`
    );
    return;
  }

  if (argv.port) {
    config.webserver.port = argv.port;
  }

  if (argv['run-location']) {
    config.run_location = argv['run-location'];
  }

  process.chdir(config.run_location);
  logger.info(`changed working directory to ${config.run_location}`);

  new WebServer(config.webserver, config.hooks).listenAndServe().then(() => {
    logger.info(
      `web server running on port ${config ? config.webserver.port : ''}`
    );
  });
}

main();
