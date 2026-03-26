// Suppress DEP0169 (url.parse) — emitted by socket.io-client / engine.io-client internals,
// not actionable from userland. removeAllListeners is required because Node's default warning
// output is itself a listener on 'warning'; adding our own handler alone does not suppress it.
process.removeAllListeners('warning')
process.on('warning', (w: Error & { code?: string }) => {
  if (w.code !== 'DEP0169') process.stderr.write(`Warning: ${w.message}\n`)
})

import {readJsonFile} from "#core/FS/utils";
import {Option, type ParseResult, program} from '#commander/index';
import type {Context} from "#types/types";
import {FOUND_LOCAL_CONFIG_FILEPATH, GLOBAL_CONFIG_FILEPATH, LOCAL_CONFIG_FILEPATH} from "#lib/defs";
import {createCommandConfig} from "#commands/CommandConfig/CommandConfig";
import {createCommandHttp} from "#commands/CommandHTTP/CommandHttp";
import {createCommandStartProfile} from "#commands/CommandUseProfile/CommandUseProfile";
import {createCommandRegister} from "#commands/CommandRegister/CommandRegister";
import {createLocalConfig} from "#config/utils";
import {createCommandAuth} from "#commands/CommandAuth/CommandAuth";
import {createCommandInit} from "#commands/CommandInit/CommandInit";
import {createCommandServer} from "#commands/CommandServer/CommandServer";
import {ParsedGlobalConfig} from "#config/ParsedGlobalConfig";
import {ParsedLocalConfig} from "#config/ParsedLocalConfig";
import {createCommandProfile} from "#commands/CommandProfile/CommandProfile";
import {createCommandDaemon} from "#commands/CommandDaemon/CommandDaemon";
import {createCommandList} from "#commands/CommandList/CommandList";
import {createCommandDashboard} from "#commands/CommandDashboard/CommandDashboard";
import {createCommandLogs} from "#commands/CommandLogs/CommandLogs";
import {createCommandStop} from "#commands/CommandStop/CommandStop";
import {createCommandRestart} from "#commands/CommandRestart/CommandRestart";
import {createCommandUpdate} from "#commands/CommandUpdate/CommandUpdate";
import {createCommandIdentity} from "#commands/CommandIdentity/CommandIdentity";
import {createCommandShare} from "#commands/CommandShare/CommandShare";
import {createCommandConnect} from "#commands/CommandConnect/CommandConnect";
import {createCommandUp} from "#commands/CommandUp/CommandUp";
import {createCommandDown} from "#commands/CommandDown/CommandDown";
import {ApiClient} from "#api-client/ApiClient";
import {readPackageJson} from "#package-json/packageJson";
import {DaemonClient} from "#daemon/DaemonClient";

const globalConf = new ParsedGlobalConfig(readJsonFile(GLOBAL_CONFIG_FILEPATH), GLOBAL_CONFIG_FILEPATH)
const localConf = FOUND_LOCAL_CONFIG_FILEPATH ? new ParsedLocalConfig(readJsonFile(FOUND_LOCAL_CONFIG_FILEPATH), FOUND_LOCAL_CONFIG_FILEPATH) : undefined
const packageJson = readPackageJson()
const ctx: Context = {
  config: {
    global: globalConf,
    local: localConf,
    createLocalConfig: () => createLocalConfig(LOCAL_CONFIG_FILEPATH)
  },
  exit(code?: number): never {
    process.exit(code ?? 0)
  },
  apiClient: new ApiClient(globalConf, localConf),
  logger: {
    info: console.info,
    error: console.error,
    warn: console.warn,
  }
}

program
  .name('tunli')
  .description('HTTP tunnel client')
  .addOption(new Option('version').short('v'))

program.addCommand(createCommandInit(ctx, program))
program.addCommand(createCommandConfig(ctx, program))
program.addCommand(createCommandHttp(ctx, program), {isDefault: true})
program.addCommand(createCommandRegister(ctx, program))
// program.addCommand(createCommandRefresh(program)) TBD
// program.addCommand(createCommandInvite(program)) TBD
program.addCommand(createCommandAuth(ctx, program))
program.addCommand(createCommandStartProfile(ctx, program))
program.addCommand(createCommandServer(ctx, program))
program.addCommand(createCommandProfile(ctx, program))
program.addCommand(createCommandDaemon(ctx, program))
program.addCommand(createCommandList(ctx, program))
program.addCommand(createCommandDashboard(ctx, program))
program.addCommand(createCommandLogs(ctx, program))
program.addCommand(createCommandStop(ctx, program))
program.addCommand(createCommandRestart(ctx, program))
program.addCommand(createCommandUpdate(ctx, program))
program.addCommand(createCommandIdentity(ctx, program))
program.addCommand(createCommandShare(ctx, program))
program.addCommand(createCommandConnect(ctx, program))
program.addCommand(createCommandUp(ctx, program))
program.addCommand(createCommandDown(ctx, program))

program.action(({options}: ParseResult) => {
  if (options.version) {
    ctx.logger.info(`tunli: ${packageJson?.version}`)
    ctx.exit(0)
  } else {
    ctx.logger.error('Error: Command "tunli": missing required argument, option or subcommand')
    ctx.exit(1)
  }
})

const args = process.argv.slice(2)
const isHelpOrVersion = args.some(a => a === '--help' || a === '-h' || a === '-?' || a === '--version' || a === '-v')
const isDaemonCommand = args[0] === 'daemon'
if (!isHelpOrVersion && !isDaemonCommand && packageJson?.version) {
  const res = await new DaemonClient().send({type: 'version'}).catch(() => null)

  if (res?.type === 'version' && res.version !== packageJson.version) {
    ctx.logger.error(
      `Daemon version mismatch: binary is ${packageJson.version}, daemon is ${res.version}.\n` +
      `Run \`tunli daemon restart\` to apply the update.`
    )
    ctx.exit(1)
  }
}

await program.parseAsync(process.argv);
