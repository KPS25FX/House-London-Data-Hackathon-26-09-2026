import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

// Tests vi.mock('@dcv/core'); if core's entry does not exist yet, alias it to an empty stub so resolution succeeds.
const coreEntry = fileURLToPath(new URL('../core/src/index.ts', import.meta.url));
const stub = fileURLToPath(new URL('./test/core-stub.ts', import.meta.url));

export default defineConfig({
  resolve: { alias: existsSync(coreEntry) ? {} : { '@dcv/core': stub } },
  test: { include: ['test/**/*.test.ts'] },
});
