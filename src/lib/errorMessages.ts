export const ERROR_MESSAGES = {
  VERSION_INCOMPATIBLE: (minClientVersion: string, clientVersion: string) =>
    `Server requires tunli >= ${minClientVersion}, you are running ${clientVersion}. Run \`npm i -g tunli\` to update.`,

  NO_LOCAL_CONFIG: "No local config found. Run `tunli init` to create one.",
  NOT_REGISTERED: "Not registered. Run `tunli register` first.",
  FAILED_TO_REACH_RELAY: (message: string) => `Failed to reach relay: ${message}`,
  UNEXPECTED_DAEMON_RESPONSE: "Unexpected response from daemon.",
  NO_DAEMON_RUNNING: "No daemon running.",
  DAEMON_NOT_RUNNING: "Daemon is not running.",
  NO_GLOBAL_CONFIG: "No global config found. Run `tunli register` to create one.",
  REGISTRATION_FAILED: "Registration failed. Please try again later.",
  NO_DAEMON_RUNNING_START_TUNNEL: "No daemon running. Start a tunnel first with `tunli http <port>`.",
  NO_DAEMON_RUNNING_START_TUNNEL_LIST: "No daemon running. Start a tunnel with `tunli http <port>`.",
  NO_DAEMON_RUNNING_USE_START: "No daemon running. Use `tunli start <profile>` instead.",
  NO_ACTIVE_TUNNELS: "No active tunnels.",
  ABORTED: "Aborted.",
  PROFILE_NOT_FOUND: (name: string) => `Profile "${name}" not found.`,
}
