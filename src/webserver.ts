/** @format */

import fs from 'fs';
import https from 'https';
import http from 'http';
import { Server } from 'net';
import express, { Express, Request, Response } from 'express';
import { ConfigWebServer, ConfigHookEntry } from './config';
import logger from './logger';
import { exec, ExecException } from 'child_process';
import bodyParser = require('body-parser');

export enum METHOD {
  ALL = 'ALL',
  GET = 'GET',
  POST = 'POST',
  DELETE = 'DELETE',
  PUT = 'PUT',
}

export class Hook {
  public properties: ConfigHookEntry;
  public generalToken: string;

  constructor(properties: ConfigHookEntry, generalToken: string) {
    this.properties = properties;
    this.generalToken = generalToken;
  }

  public handler(req: Request, res: Response, next: () => void): void {
    if (!this.checkAuth(req, res)) {
      return;
    }

    delete req.headers.authorization;
    delete req.headers.token;
    delete req.query.token;

    let parameter = JSON.stringify({
      query: req.query,
      headers: req.headers,
      param: req.params,
      body: req.body,
    }).replace(/'/gm, "\\'");

    this.properties.scripts.forEach((script) => {
      exec(
        `${script} '${parameter}'`,
        (err: ExecException | null, stdout: string, stderr: string) => {
          if (err) {
            logger.error(
              `HOOK SCRIPT FAILED :: ${this.properties.name} :: ${req.method} ${
                req.path
              } :: ${err.message}`
            );
            return;
          }

          logger.info(
            `HOOK SCRIPT SUCCESS :: ${this.properties.name} :: ${req.method} ${
              req.path
            } :: ${stdout || stderr || '<no std out>'}`
          );
        }
      );
    });

    res.status(200).send({ code: 200, message: 'ok' });
  }

  private checkAuth(req: Request, res: Response): boolean {
    let token = this.properties.token || this.generalToken;

    if (
      req.query.token === token ||
      req.headers.token === token ||
      (req.headers.authorization &&
        req.headers.authorization.substring(6) === token)
    ) {
      return true;
    }

    res.status(401).send({
      code: 401,
      message: 'unauthorized',
    });
    return false;
  }
}

export default class WebServer {
  private app: Express;
  private config: ConfigWebServer;

  constructor(config: ConfigWebServer, hooks: Array<ConfigHookEntry>) {
    this.app = express();
    this.app.use(bodyParser.json());
    this.app.use(bodyParser.urlencoded({ extended: false }));
    this.config = config;

    if (!config.general_token) {
      throw new Error('general_token value must be set');
    }

    hooks.forEach((hook) => {
      hook.methods
        .map((method) => method.toUpperCase())
        .forEach((method) => {
          logger.info(
            `registered hook '${hook.name}' on '${method} ${hook.endpoint}'`
          );
          let hookObj = new Hook(hook, this.config.general_token);
          this.getRequestMethod(method)
            .bind(this.app, hook.endpoint, hookObj.handler.bind(hookObj))
            .call();
        });
    });
  }

  public listenAndServe(): Promise<Server> {
    return new Promise((resolve, rejects) => {
      if (this.config.enabletls) {
        resolve(
          https
            .createServer(this.getTLSCRedentials(), this.app)
            .listen(this.config.port)
        );
      } else {
        resolve(http.createServer(this.app).listen(this.config.port));
      }
    });
  }

  private getTLSCRedentials(): any {
    var cert = fs.readFileSync(this.config.tlscert).toString();
    var key = fs.readFileSync(this.config.tlskey).toString();
    return { cert, key };
  }

  private getRequestMethod(method: string) {
    var reqMethod: any;
    switch (method) {
      case METHOD.ALL:
        reqMethod = this.app.all;
        break;
      case METHOD.DELETE:
        reqMethod = this.app.delete;
        break;
      case METHOD.GET:
        reqMethod = this.app.get;
        break;
      case METHOD.POST:
        reqMethod = this.app.post;
        break;
      case METHOD.PUT:
        reqMethod = this.app.put;
        break;
      default:
        throw Error('unallowed method');
    }

    return reqMethod;
  }
}
