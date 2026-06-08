#!/usr/bin/env tsx
import { runFoldCli } from './app.js';

await runFoldCli(process.argv.slice(2), {
  process,
  cwd: process.cwd(),
});
