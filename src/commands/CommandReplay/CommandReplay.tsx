import {Argument, Command, Option} from '#commander/index'
import type {Context} from '#types/types'
import {daemonClient} from '#daemon/DaemonClient'
import type {StoredRequestMeta, TunnelInfo} from '#daemon/protocol'
import {Box, render, Text, useApp, useInput} from 'ink'
import {useState} from 'react'
import chalk from 'chalk'
import {ERROR_MESSAGES} from "#lib/errorMessages"

const statusColor = (status: number | null | undefined): string => {
  if (!status) return '—'
  if (status >= 500) return chalk.red(String(status))
  if (status >= 400) return chalk.yellow(String(status))
  return chalk.green(String(status))
}

type PickerAppProps = {
  requests: StoredRequestMeta[]
  onSelect: (r: StoredRequestMeta) => void
}

const RequestPickerApp = ({requests, onSelect}: PickerAppProps) => {
  const {exit} = useApp()
  const [index, setIndex] = useState(0)

  useInput((input, key) => {
    if (input === 'q' || key.escape) {
      exit();
      return
    }
    if (key.upArrow) setIndex(i => Math.max(0, i - 1))
    if (key.downArrow) setIndex(i => Math.min(requests.length - 1, i + 1))
    if (key.return) {
      const r = requests[index]
      if (r) onSelect(r)
      exit()
    }
  })

  const pathW = Math.max(40, ...requests.map(r => r.path.length + 2))
  const methodW = 8

  return (
    <Box flexDirection="column" padding={1}>
      <Text bold>Recent requests</Text>
      <Text>{'─'.repeat(60)}</Text>
      {requests.map((r, i) => {
        const selected = i === index
        const time = new Date(r.timestamp).toLocaleTimeString()
        const status = statusColor(r.response?.status ?? null)
        const unavail = r.bodyUnavailable ? chalk.dim(' [!]') : ''
        const replayed = r.replayOf ? chalk.dim(' ↺') : ''
        return (
          <Box key={r.id}>
            <Box minWidth={2}><Text color="cyan">{selected ? '›' : ' '}</Text></Box>
            <Box minWidth={methodW}><Text bold={selected}>{r.method}</Text></Box>
            <Box minWidth={pathW}><Text bold={selected}>{r.path}</Text></Box>
            <Box minWidth={8}><Text>{status}</Text></Box>
            <Text dimColor>{time}{unavail}{replayed}</Text>
          </Box>
        )
      })}
      <Text> </Text>
      <Text dimColor>↑↓ navigate · Enter replay · q quit</Text>
    </Box>
  )
}

const pickRequest = (requests: StoredRequestMeta[]): Promise<StoredRequestMeta | null> =>
  new Promise(resolve => {
    let selected: StoredRequestMeta | null = null
    const {waitUntilExit} = render(
      <RequestPickerApp requests={requests} onSelect={r => {
        selected = r
      }}/>,
      {exitOnCtrlC: true},
    )
    void waitUntilExit().then(() => resolve(selected)).catch(() => resolve(null))
  })

export const createCommandReplay = (ctx: Context, _program: Command) => {
  type Options = { last?: boolean; id?: string }

  return new Command('replay')
    .description('Replay a captured HTTP request')
    .addArgument(new Argument('profile', 'Profile name'))
    .addOption(new Option('last', 'Replay the most recent request without prompting'))
    .addOption(new Option('id', 'Replay a specific request by ID').argument('requestId'))
    .action(async ({args, options}) => {
      const opt = options as Options
      let profileName = args.profile as string | undefined

      // If no profile given, pick from running tunnels
      if (!profileName) {
        const res = await daemonClient().send({type: 'list'}).catch(() => null)
        if (!res || res.type !== 'list' || res.tunnels.length === 0) {
          ctx.stdErr(ERROR_MESSAGES.NO_ACTIVE_TUNNELS)
          return ctx.exit(1)
        }
        if (res.tunnels.length === 1) {
          profileName = res.tunnels[0]!.profileName
        } else {
          // pick tunnel first — reuse same pattern as dashboard
          const {pickTunnel} = await import('#cli-app/TunnelPicker')
          const tunnel = await pickTunnel(res.tunnels as TunnelInfo[])
          if (!tunnel) return
          profileName = tunnel.profileName
        }
      }

      const listRes = await daemonClient().send({type: 'list-requests', profileName}).catch(() => null)
      if (!listRes || listRes.type !== 'request-list') {
        ctx.stdErr('Failed to fetch request history.')
        return ctx.exit(1)
      }
      if (listRes.requests.length === 0) {
        ctx.stdOut('No requests captured yet for this tunnel.')
        return
      }

      let target: StoredRequestMeta | null = null

      if (opt.id) {
        target = listRes.requests.find(r => r.id === opt.id) ?? null
        if (!target) {
          ctx.stdErr(`Request not found: ${opt.id}`)
          return ctx.exit(1)
        }
      } else if (opt.last) {
        target = listRes.requests[0] ?? null
      } else {
        target = await pickRequest(listRes.requests)
      }

      if (!target) return

      if (target.bodyUnavailable) {
        ctx.stdErr('Cannot replay: body not available (captured before last restart).')
        return ctx.exit(1)
      }

      ctx.stdOut(`Replaying ${target.method} ${target.path}…`)
      const res = await daemonClient().send({type: 'replay', profileName, requestId: target.id}).catch(e => {
        ctx.stdErr(e instanceof Error ? e.message : String(e))
        return null
      })
      if (!res) return ctx.exit(1)
      if (res.type === 'error') {
        ctx.stdErr(res.message)
        return ctx.exit(1)
      }
      if (res.type === 'replay-done') {
        const color = res.status >= 500 ? chalk.red : res.status >= 400 ? chalk.yellow : chalk.green
        ctx.stdOut(`→ ${color(String(res.status))}  ${res.durationMs}ms`)
      }
    })
}
