import { App } from './app';

async function main(): Promise<void> {
  const app = new App();

  if (process.argv.includes('--check')) {
    process.stdout.write('Running headless setup check...\n');
    const ok = await app.runSetupCheck();
    if (ok) {
      process.stdout.write('Setup check passed: Metrics collection and OOP classes verified.\n');
      process.exit(0);
    } else {
      process.stderr.write('Setup check failed.\n');
      process.exit(1);
    }
  } else {
    await app.start();
  }
}

main().catch((err) => {
  process.stderr.write(`Fatal Error: ${err instanceof Error ? err.stack : String(err)}\n`);
  process.exit(1);
});
