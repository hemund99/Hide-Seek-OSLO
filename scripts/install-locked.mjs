import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { readExecutionProfile } from './execution-profile.mjs';

const managed = readExecutionProfile() === 'managed-linux';
if (!managed && (!process.env.npm_execpath || !/pnpm/i.test(process.env.npm_execpath))) {
  throw new Error('Run this installer with pnpm run install:ci (pnpm 11.25.0).');
}
// Managed Sites keeps its existing installer. Portable hosts use pnpm's JS
// entrypoint directly, avoiding Bash/flock/timeout and Windows .cmd spawning.
const result = spawnSync(managed ? 'bash' : process.execPath, managed
  ? [fileURLToPath(new URL('./install-pnpm.sh', import.meta.url))]
  : [process.env.npm_execpath, 'install', '--frozen-lockfile'],
  { stdio: 'inherit' });
if (result.error) throw result.error;
process.exitCode = result.status ?? 1;
