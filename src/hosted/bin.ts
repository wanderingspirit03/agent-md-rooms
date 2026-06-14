import { runHostedCli } from './entrypoint.js';

void runHostedCli().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
