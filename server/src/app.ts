import { createServer, type Server } from 'node:http';
import { createHandler, type AppDeps, type ReqLog } from './routes.js';

export type Logger = (line: string) => void;

/** node:http server wiring the routes; logs one line per request (no memo text, no secrets). */
export function createApp(deps: AppDeps, logger: Logger = (l) => console.log(l)): Server {
  const handle = createHandler(deps);
  return createServer((req, res) => {
    const t0 = performance.now();
    const log: ReqLog = { route: `${req.method} ${req.url}` };
    res.on('close', () => {
      const ms = Math.round(performance.now() - t0);
      const parts = [
        new Date().toISOString(), log.route, `seat=${log.seat ?? '-'}`,
        `status=${log.status ?? res.statusCode}`, `${ms}ms`, `llm=${deps.llm.mode}`,
      ];
      if (log.error) parts.push(`err=${log.error}`);
      logger(parts.join(' '));
    });
    handle(req, res, log).catch(() => {
      if (!res.headersSent) res.writeHead(500);
      res.end();
    });
  });
}
