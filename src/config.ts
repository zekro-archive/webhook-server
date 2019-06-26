/** @format */

import yaml from 'js-yaml';
import fs from 'fs';
import { rnadomStirng } from './util';

export class Config {
  public webserver: ConfigWebServer = new ConfigWebServer();
  public hooks: Array<ConfigHookEntry> = [
    {
      name: 'example-hook',
      enabled: true,
      endpoint: '/test',
      methods: ['GET'],
      scripts: ['bash ./scripts/example.sh'],
      token: '',
    },
  ];
}

export class ConfigWebServer {
  public port: number = 8080;
  public general_token: string;
  public enabletls: boolean = false;
  public tlscert: string = '';
  public tlskey: string = '';

  constructor() {
    this.general_token = rnadomStirng(32);
  }
}

export type ConfigHookEntry = {
  name: string;
  enabled: boolean;
  endpoint: string;
  methods: Array<string>;
  scripts: Array<string>;
  token: string;
};

export class ConfigLoader {
  public static createSync(loc: string, config: Config) {
    let data = yaml.safeDump(config);
    fs.writeFileSync(loc, data, 'utf8');
  }

  public static openSync(loc: string): Config | null {
    if (!fs.existsSync(loc)) {
      let cfg = new Config();
      ConfigLoader.createSync(loc, cfg);
      return null;
    }

    let data = fs.readFileSync(loc, 'utf8');
    return yaml.safeLoad(data);
  }
}
