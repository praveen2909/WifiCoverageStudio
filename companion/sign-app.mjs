import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const appPath = join(
  dirname(fileURLToPath(import.meta.url)),
  'bin',
  'WiFiCoverageStudioCompanion.app',
);
const identity = process.env.CODESIGN_IDENTITY?.trim() || '-';

if (identity === '-') {
  console.warn(
    'No CODESIGN_IDENTITY set: using an ad-hoc signature. macOS may forget Location Services permission after each rebuild.',
  );
}

const sign = spawnSync(
  'codesign',
  [
    '--force',
    '--deep',
    '--sign',
    identity,
    '--identifier',
    'com.wificoveragestudio.companion',
    appPath,
  ],
  { stdio: 'inherit' },
);

if (sign.error) throw sign.error;
if (sign.status !== 0) process.exit(sign.status ?? 1);

const verify = spawnSync('codesign', ['--verify', '--deep', '--strict', appPath], {
  stdio: 'inherit',
});

if (verify.error) throw verify.error;
if (verify.status !== 0) process.exit(verify.status ?? 1);

if (identity !== '-') {
  console.log(`Signed companion with: ${identity}`);
}
