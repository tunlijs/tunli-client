// SEA (Single Executable Application) entry point.
// Bundled by esbuild into a single CJS file containing both CLI and daemon.
// The daemon is distinguished at runtime via the TUNLI_DAEMON env var.

if (process.env.TUNLI_DAEMON === '1') {
  await import('./daemon-main.js')
} else {
  await import('./client.js')
}
