import {Command} from "#commander/index";
import type {Context} from "#types/types";
import {DaemonClient} from "#daemon/DaemonClient";
import {type Align, heading, row, separator, tableWidth} from "#output-formats/table";
import chalk from "chalk";
import type {TunnelInfo} from "#daemon/protocol";

const statusColor = (status: TunnelInfo['status']) => {
  switch (status) {
    case 'connected':
      return chalk.green(status)
    case 'connecting':
      return chalk.yellow(status)
    case 'disconnected':
      return chalk.dim(status)
    case 'error':
      return chalk.red(status)
  }
}

const formatTunnelList = (tunnels: TunnelInfo[]): string => {
  const profileW = Math.max(7, ...tunnels.map(t => t.profileName.length))
  const urlW = Math.max(9, ...tunnels.map(t => t.proxyURL.length))
  const statusW = Math.max(6, ...tunnels.map(t => t.status.length))
  const targetW = Math.max(6, ...tunnels.map(t => t.target.length))

  const widths = [profileW, urlW, statusW, targetW]
  const aligns: Align[] = ['left', 'left', 'left', 'left']

  const w = tableWidth(widths)
  const lines: string[] = [
    heading('Active Tunnels', w),
    row(['PROFILE', 'PROXY URL', 'STATUS', 'TARGET'], widths, aligns),
    separator(widths),
    ...tunnels.map(t =>
      row(
        [t.profileName, t.proxyURL, t.status, t.target],
        widths,
        aligns,
        [undefined, chalk.cyan, statusColor as () => string, undefined]
      )
    ),
  ]
  return lines.join('\n')
}

export const createCommandList = (ctx: Context, _program: Command) => {
  return new Command('list')
    .description('List active tunnels')
    .action(async () => {
      if (!await DaemonClient.isRunning()) {
        ctx.logger.info('No daemon running. Start a tunnel with `tunli http <port>`.')
        return
      }
      const client = new DaemonClient()
      const result = await client.send({type: 'list'})
      if (result.type !== 'list') {
        ctx.logger.error('Unexpected response from daemon.')
        return
      }
      if (!result.tunnels.length) {
        ctx.logger.info('No active tunnels.')
        return
      }
      ctx.logger.info(formatTunnelList(result.tunnels))
    })
}
