import {Argument, Command} from "#commander/index";
import type {Context, ProfileConfig} from "#types/types";
import {attachTunnel, daemonClient} from "#daemon/DaemonClient";
import type {TunnelInfo} from "#daemon/protocol";
import {AppEventEmitter} from "#cli-app/AppEventEmitter";
import {initDashboard} from "#cli-app/Dashboard";
import {pickTunnel} from "#cli-app/TunnelPicker";
import {ERROR_MESSAGES} from "#lib/errorMessages";

export const createCommandDashboard = (ctx: Context, _program: Command) => {
  return new Command('dashboard')
    .description('Attach to a running tunnel and show the live dashboard')
    .addArgument(new Argument('profile', 'Profile name to attach to'))
    .action(async ({args}) => {
      if (!await daemonClient().isRunning()) {
        ctx.stdErr(ERROR_MESSAGES.NO_DAEMON_RUNNING_START_TUNNEL)
        return ctx.exit(1)
      }

      const listResult = await daemonClient().send({type: 'list'})
      if (listResult.type !== 'list') return ctx.exit(1)

      if (listResult.tunnels.length === 0) {
        ctx.stdErr(ERROR_MESSAGES.NO_ACTIVE_TUNNELS)
        return ctx.exit(1)
      }

      // A: pre-start picker when no profile arg and multiple tunnels are running
      let profileName = args.profile as string | undefined
      if (!profileName) {
        if (listResult.tunnels.length === 1) {
          profileName = listResult.tunnels[0]!.profileName
        } else {
          const picked = await pickTunnel(listResult.tunnels)
          if (!picked) return ctx.exit(0)
          profileName = picked.profileName
        }
      }

      const tunnelInfo = listResult.tunnels.find(t => t.profileName === profileName)
      if (!tunnelInfo) {
        ctx.stdErr(`No tunnel running for profile "${profileName}".`)
        return ctx.exit(1)
      }

      const buildMockConfig = (info: TunnelInfo): ProfileConfig => {
        const url = new URL(info.target)
        const protocol = url.protocol.slice(0, -1) as 'http' | 'https'
        const host = url.hostname
        const port = url.port ? Number(url.port) : (protocol === 'https' ? 443 : 80)
        return {
          profileName: info.profileName,
          filepath: '-',
          allowedCidr: [],
          deniedCidr: [],
          proxy: {proxyIdent: '', proxyURL: info.proxyURL},
          target: {host, port, protocol},
          serverConfig: {url: '', authToken: ''},
          apiClient: ctx.apiClient,
        }
      }

      // Track the current attach so it can be disconnected on tunnel switch
      const attachState = {
        disconnect: () => {
        }
      }

      // C: switch handler — called from inside the dashboard via Ctrl+T modal
      let rerenderDashboard: ((config: ProfileConfig, emitter: AppEventEmitter, tunnels: TunnelInfo[]) => void) | null = null

      const onSwitchTunnel = async (newTunnel: TunnelInfo) => {
        attachState.disconnect()

        const newEmitter = new AppEventEmitter()
        const {promise, disconnect} = attachTunnel(newTunnel.profileName, newEmitter)
        attachState.disconnect = disconnect

        const newResult = await promise.catch(() => null)

        const refreshed = await daemonClient().send({type: 'list'})
        const allTunnels = refreshed.type === 'list' ? refreshed.tunnels : [newTunnel]

        rerenderDashboard?.(buildMockConfig(newTunnel), newEmitter, allTunnels)

        if (newResult?.status === 'connected') newEmitter.emit('connect')
        if (newResult?.status === 'disconnected') newEmitter.emit('disconnect', 'io client disconnect')
        if (newResult?.lastLatency !== undefined) newEmitter.emit('latency', newResult.lastLatency)
        if (newResult?.requestCount) newEmitter.emit('request-count', newResult.requestCount)
      }

      const appEmitter = new AppEventEmitter()
      const {promise: attachPromise, disconnect} = attachTunnel(profileName, appEmitter)
      attachState.disconnect = disconnect

      const attachResult = await attachPromise.catch((e: Error) => {
        ctx.stdErr(e.message)
        ctx.exit(1)
      })

      const {rerender} = initDashboard(buildMockConfig(tunnelInfo), appEmitter, listResult.tunnels, onSwitchTunnel)
      rerenderDashboard = rerender

      if (attachResult?.status === 'connected') appEmitter.emit('connect')
      if (attachResult?.status === 'disconnected') appEmitter.emit('disconnect', 'io client disconnect')
      if (attachResult?.lastLatency !== undefined) appEmitter.emit('latency', attachResult.lastLatency)
      if (attachResult?.requestCount) appEmitter.emit('request-count', attachResult.requestCount)
    })
}
