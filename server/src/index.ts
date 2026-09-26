import { loadConfig } from './config.js';
import { DataStore } from './data.js';
import { AnthropicLlm, MockLlm, type Llm } from './llm.js';
import { createApp } from './app.js';

const config = loadConfig();
const store = new DataStore(config.dataDir);
if (store.load()) console.log(`data loaded from ${config.dataDir} (version ${store.version ?? '?'})`);
else console.warn(`data not loaded from ${config.dataDir}: ${store.loadError} (memo/ask return 503 until GET /api/reload succeeds)`);

const llm: Llm = config.apiKey ? new AnthropicLlm(config.apiKey, config.model) : new MockLlm(48, 15);

process.on('SIGHUP', () => {
  console.log(store.load() ? 'data reloaded' : `reload failed: ${store.loadError}`);
});

createApp({ store, llm, config }).listen(config.port, () => {
  console.log(`memo server on http://localhost:${config.port} · llm=${llm.mode} · model=${llm.model}`);
});
