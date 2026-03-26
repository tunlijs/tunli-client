// SEA (Single Executable Application) entry point.
// Bundled by esbuild into a single CJS file containing both CLI and daemon.
// The daemon is distinguished at runtime via the TUNLI_DAEMON env var.
// This binary is spawned and supervised by the launcher (launcher-main.ts).

// Suppress DEP0169 (url.parse) — emitted by socket.io-client / engine.io-client internals,
// not actionable from userland. removeAllListeners is required because Node's default warning
// output is itself a listener on 'warning'; adding our own handler alone does not suppress it.
process.removeAllListeners('warning')
process.on('warning', (w: Error & {code?: string}) => { if (w.code !== 'DEP0169') process.stderr.write(`Warning: ${w.message}\n`) })

if (process.env.TUNLI_DAEMON === '1') {
  await import('./daemon-main.js')
} else {
  // If a restart dump exists the daemon was stopped for an update.
  // Start it now so it can restore the tunnels before the CLI runs.
  const {existsSync} = await import('node:fs')
  const {RESTART_DUMP_FILEPATH} = await import('./lib/defs.js')
  if (existsSync(RESTART_DUMP_FILEPATH)) {
    const {DaemonClient} = await import('./daemon/DaemonClient.js')
    await DaemonClient.ensureRunning()
  }
  await import('./client.js')
}
