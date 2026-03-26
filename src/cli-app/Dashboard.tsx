import {useState, useEffect, useRef} from 'react'
import {Box, render, Text, useApp, useInput, useStdout} from 'ink'
import chalk from 'chalk'
import QRCode from 'qrcode'
import type {ProfileConfig} from '#types/types'
import type {TunnelInfo} from '#daemon/protocol'
import type {AppEventEmitter, Req, Res} from '#cli-app/AppEventEmitter'
import {readPackageJson} from '#package-json/packageJson'
import {setCursorVisibility} from '#utils/cliFunctions'
import {getAvailableUpdate, performUpdate} from '#cli-app/versionCheck'
import {CHECK_FOR_UPDATES} from "#lib/defs";

type LogEntry = {
  method: string
  path: string
  status: string
  runtime: string | undefined
  id: number
  req: Req
  res: Res
}

const stripAnsi = (s: string) => s.replace(/\x1b\[[0-9;]*m/g, '')

const SPINNER_CHARS = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'] as const

const Spinner = ({spinning}: { spinning: boolean }) => {
  const [index, setIndex] = useState(0)

  useEffect(() => {
    if (!spinning) return
    const id = setInterval(() => setIndex(i => (i + 1) % SPINNER_CHARS.length), 100)
    return () => clearInterval(id)
  }, [spinning])

  return <Text>{spinning ? (SPINNER_CHARS[index] ?? ' ') : ' '}</Text>
}

const InfoRow = ({label, value}: { label: string, value: string }) => (
  <Box>
    <Box minWidth={30}><Text>{label}</Text></Box>
    <Text>{value}</Text>
  </Box>
)

const QRModal = ({text, onClose}: { text: string, onClose: () => void }) => {
  const {stdout} = useStdout()

  useInput((input, key) => {
    if (key.escape || input === 'q') onClose()
  })

  return (
    <Box width="100%" height={stdout.rows} flexDirection="column" alignItems="center" justifyContent="center">
      <Box flexDirection="column" borderStyle="round" borderColor="cyan" padding={1}>
        <Text dimColor>Press q or Escape to close</Text>
        <Text>{text}</Text>
      </Box>
    </Box>
  )
}

const TunnelSwitcherModal = ({tunnels, current, onSelect, onClose}: {
  tunnels: TunnelInfo[]
  current: string
  onSelect: (t: TunnelInfo) => void
  onClose: () => void
}) => {
  const {stdout} = useStdout()
  const [index, setIndex] = useState(() => Math.max(0, tunnels.findIndex(t => t.profileName === current)))

  useInput((input, key) => {
    if (key.escape || input === 'q') { onClose(); return }
    if (key.upArrow) setIndex(i => Math.max(0, i - 1))
    if (key.downArrow) setIndex(i => Math.min(tunnels.length - 1, i + 1))
    if (key.return) {
      const t = tunnels[index]
      if (t && t.profileName !== current) onSelect(t)
      onClose()
    }
  })

  return (
    <Box width="100%" height={stdout.rows} flexDirection="column" alignItems="center" justifyContent="center">
      <Box flexDirection="column" borderStyle="round" borderColor="cyan" paddingX={2} paddingY={1} minWidth={50}>
        <Box justifyContent="space-between">
          <Text bold>Switch Tunnel</Text>
          <Text dimColor>q / Esc to close</Text>
        </Box>
        <Text> </Text>
        {tunnels.map((t, i) => (
          <Box key={t.profileName}>
            <Box minWidth={2}><Text color="cyan">{i === index ? '›' : ' '}</Text></Box>
            <Box minWidth={24}><Text bold={i === index}>{t.profileName}</Text></Box>
            <Text dimColor>{t.proxyURL}</Text>
          </Box>
        ))}
        <Text> </Text>
        <Text dimColor>↑↓ navigate · Enter select</Text>
      </Box>
    </Box>
  )
}

const DetailModal = ({entry, onClose}: { entry: LogEntry, onClose: () => void }) => {
  const {stdout} = useStdout()

  useInput((input, key) => {
    if (key.escape || input === 'q') onClose()
  })

  const reqHeaders = Object.entries(entry.req.headers)
  const resHeaders = Object.entries(entry.res.headers)

  return (
    <Box width="100%" height={stdout.rows} flexDirection="column" alignItems="center" justifyContent="center">
      <Box flexDirection="column" borderStyle="round" borderColor="cyan" paddingX={2} paddingY={1} width={Math.min(stdout.columns - 4, 100)}>
        <Box justifyContent="space-between">
          <Text bold>{entry.method} {entry.path}</Text>
          <Text dimColor>q / Esc to close</Text>
        </Box>
        <Box marginTop={1} gap={4}>
          <Text>{entry.status}</Text>
          {entry.runtime ? <Box><Text dimColor>Duration  </Text><Text>{entry.runtime}</Text></Box> : null}
          <Box><Text dimColor>Time  </Text><Text>{new Date(entry.id).toLocaleTimeString()}</Text></Box>
        </Box>

        <Text> </Text>
        <Text bold>Request Headers</Text>
        <Text>{'─'.repeat(40)}</Text>
        {reqHeaders.length === 0
          ? <Text dimColor>—</Text>
          : reqHeaders.map(([k, v]) => (
            <Box key={k}>
              <Box minWidth={30}><Text color="cyan">{k}</Text></Box>
              <Text>{String(v)}</Text>
            </Box>
          ))
        }

        <Text> </Text>
        <Text bold>Response Headers</Text>
        <Text>{'─'.repeat(40)}</Text>
        {resHeaders.length === 0
          ? <Text dimColor>—</Text>
          : resHeaders.map(([k, v]) => (
            <Box key={k}>
              <Box minWidth={30}><Text color="cyan">{k}</Text></Box>
              <Text>{String(v)}</Text>
            </Box>
          ))
        }
      </Box>
    </Box>
  )
}

type DashboardAppProps = {
  config: ProfileConfig
  appEventEmitter: AppEventEmitter
  allTunnels: TunnelInfo[]
  onSwitchTunnel: (tunnel: TunnelInfo) => void
}

const DashboardApp = ({config, appEventEmitter, allTunnels, onSwitchTunnel}: DashboardAppProps) => {
  const {exit} = useApp()
  const {stdout} = useStdout()
  const packageJson = readPackageJson()

  const [spinning, setSpinning] = useState(true)
  const [connectionStatus, setConnectionStatus] = useState(chalk.yellow('offline'))
  const [availableUpdate, setAvailableUpdate] = useState('')
  const [latestVersion, setLatestVersion] = useState<string | null>(null)
  const [updatingPackage, setUpdatingPackage] = useState(false)
  const [requestCount, setRequestCount] = useState(0)
  const [blockedCount, setBlockedCount] = useState(0)
  const [lastBlockedIp, setLastBlockedIp] = useState('')
  const [accessLog, setAccessLog] = useState<LogEntry[]>([])
  const [qrText, setQrText] = useState<string | null>(null)
  const [latency, setLatency] = useState<number | null>(null)
  const [paused, setPaused] = useState(false)
  const [cursorIndex, setCursorIndex] = useState<number | null>(null)
  const [detailEntry, setDetailEntry] = useState<LogEntry | null>(null)
  const [switcherOpen, setSwitcherOpen] = useState(false)

  const runtimeStack = useRef(new Map<string, number>())
  const pendingLog = useRef<LogEntry[]>([])
  const accessLogRef = useRef<LogEntry[]>([])
  const pausedRef = useRef(false)

  const forwardingUrl = `${config.proxy.proxyURL} -> http://${config.target.host}:${config.target.port}/`

  useEffect(() => {
    if (!CHECK_FOR_UPDATES) return
    if (!packageJson) return
    void getAvailableUpdate(packageJson.version).then(version => {
      if (version) {
        setLatestVersion(version)
        setAvailableUpdate(chalk.yellow(`update available (version ${version}, Ctrl-U to update)`))
      }
    })
  }, [])

  useEffect(() => {
    appEventEmitter
      .on('connect', () => {
        setSpinning(false)
        setConnectionStatus(chalk.bold(chalk.green('online')))
      })
      .on('disconnect', () => {
        setSpinning(true)
        setConnectionStatus(chalk.bold(chalk.red('offline')))
      })
      .on('connect_error', (e) => {
        setSpinning(true)
        setConnectionStatus(`${chalk.bold(chalk.red('error'))} - ${e.message}`)
      })
      .on('request', (req) => {
        runtimeStack.current.set(req.requestId, Date.now())
      })
      .on('response', (req, res) => {
        const now = Date.now()
        const startTime = runtimeStack.current.get(req.requestId)
        runtimeStack.current.delete(req.requestId)
        const runtimeMs = startTime !== undefined ? now - startTime : undefined

        let rspMsg = `${res.statusCode} ${res.statusMessage}`
        if (res.statusCode >= 500) rspMsg = chalk.red(rspMsg)
        else if (res.statusCode >= 400) rspMsg = chalk.blueBright(rspMsg)
        else rspMsg = chalk.green(rspMsg)
        rspMsg = chalk.bold(rspMsg)

        let runtime: string | undefined
        if (runtimeMs !== undefined) {
          const label = `${runtimeMs}ms`
          runtime = runtimeMs < 100 ? chalk.green(label)
            : runtimeMs < 500 ? chalk.yellow(label)
              : chalk.red(label)
        }

        const entry: LogEntry = {method: req.method, path: req.path, status: rspMsg, runtime, id: now, req, res}

        setRequestCount(c => c + 1)

        if (pausedRef.current) {
          pendingLog.current.push(entry)
        } else {
          setAccessLog(log => {
            const next = [...log, entry].slice(-30)
            accessLogRef.current = next
            return next
          })
        }
      })
      .on('client-blocked', (ip) => {
        setBlockedCount(c => c + 1)
        setLastBlockedIp(ip)
      })
      .on('latency', (ms) => setLatency(ms))
      .on('request-count', (count) => setRequestCount(count))
  }, [])

  // Ctrl+C always active
  useInput((input, key) => {
    if (key.ctrl && input === 'c') {
      exit()
      process.exit(0)
    }
  })

  // Main key handler — inactive when any modal is open
  useInput((input, key) => {
    if (key.ctrl && input === 't' && allTunnels.length > 1) {
      setSwitcherOpen(true)
    }
    if (key.ctrl && input === 'r') {
      setAvailableUpdate(chalk.yellow('Restarting...'))
      process.send?.('restart')
    }
    if (key.ctrl && input === 'q') {
      QRCode.toString(config.proxy.proxyURL, {type: 'terminal'}, (err, url) => {
        if (!err) setQrText(url)
      })
    }
    if (key.ctrl && input === 'p') {
      const next = !pausedRef.current
      pausedRef.current = next
      setPaused(next)
      if (!next) {
        // unpause: flush buffered entries
        setAccessLog(log => {
          const flushed = [...log, ...pendingLog.current].slice(-30)
          accessLogRef.current = flushed
          pendingLog.current = []
          return flushed
        })
      }
    }
    if (key.ctrl && input === 'u' && latestVersion && !updatingPackage && packageJson) {
      setUpdatingPackage(true)
      setAvailableUpdate(chalk.yellow('Updating...'))
      void performUpdate(packageJson.name, (result) => {
        if (result.status === 'progress') {
          setAvailableUpdate(chalk.yellow(result.message))
          return
        }
        setUpdatingPackage(false)
        if (result.status === 'success') {
          setAvailableUpdate(chalk.green('Update done. Restart the daemon to apply. (Ctrl+R to restart)'))
        } else {
          setAvailableUpdate(chalk.red(`Update failed: ${result.reason}`))
        }
      })
    }
    // cursor navigation
    if (key.upArrow) {
      setCursorIndex(i => {
        if (i === null) return 0
        return Math.max(0, i - 1)
      })
    }
    if (key.downArrow) {
      setCursorIndex(i => {
        const max = accessLogRef.current.length - 1
        if (i === null) return 0
        return Math.min(max, i + 1)
      })
    }
    if (key.escape) {
      setCursorIndex(null)
    }
    if (key.return && cursorIndex !== null) {
      const displayed = [...accessLogRef.current].reverse()
      const entry = displayed[cursorIndex]
      if (entry) setDetailEntry(entry)
    }
  }, {isActive: qrText === null && detailEntry === null && !switcherOpen})

  const allowedCidr = config.allowedCidr.length ? config.allowedCidr : null
  const deniedCidr = config.deniedCidr.length ? config.deniedCidr : null

  if (qrText !== null) {
    return <QRModal text={qrText} onClose={() => setQrText(null)}/>
  }

  if (detailEntry !== null) {
    return <DetailModal entry={detailEntry} onClose={() => setDetailEntry(null)}/>
  }

  if (switcherOpen) {
    return <TunnelSwitcherModal
      tunnels={allTunnels}
      current={config.profileName}
      onSelect={onSwitchTunnel}
      onClose={() => setSwitcherOpen(false)}
    />
  }

  const displayedLog = [...accessLog].reverse()
  const pathColWidth = Math.max(40, ...accessLog.map(e => e.path.length + 3))
  const statusColWidth = Math.max(20, ...accessLog.map(e => stripAnsi(e.status).length + 3))

  return (
    <Box flexDirection="column" height={stdout.rows}>
      <Box width="100%" justifyContent="space-between">
        <Box>
          <Text>tunli </Text>
          <Spinner spinning={spinning}/>
        </Box>
        <Text>{allTunnels.length > 1 ? '(Ctrl+T switch · Ctrl+C quit)' : '(Ctrl+C to quit)'}</Text>
      </Box>
      <Box marginTop={1} flexDirection="column">
        <InfoRow label="Tunnel" value={connectionStatus}/>
        {packageJson ? <InfoRow label="Version" value={packageJson.version}/> : null}
        {availableUpdate ? <InfoRow label={chalk.yellow('Update')} value={availableUpdate}/> : null}
        <InfoRow label="Profile" value={config.profileName}/>
        <InfoRow label="Config" value={config.filepath}/>
        <InfoRow label="QR-Code" value="Ctrl-Q"/>
        {(allowedCidr ?? deniedCidr) ? <Text> </Text> : null}
        {allowedCidr ? <InfoRow label="Allowed" value={allowedCidr.join(', ')}/> : null}
        {deniedCidr ? <InfoRow label="Denied" value={deniedCidr.join(', ')}/> : null}
        {(allowedCidr ?? deniedCidr) ? (
          <InfoRow label="Blocked" value={`${blockedCount}${lastBlockedIp ? ` (${lastBlockedIp})` : ''}`}/>
        ) : null}
        <Text> </Text>
        <InfoRow label="Latency" value={latency !== null ? `${latency}ms` : '—'}/>
        <InfoRow label="Forwarding" value={forwardingUrl}/>
        <InfoRow label="Connections" value={String(requestCount)}/>
      </Box>
      <Text> </Text>
      <Box justifyContent="space-between">
        <Text>HTTP Requests{cursorIndex !== null ? chalk.dim('  ↑↓ navigate · Enter detail · Esc exit') : chalk.dim('  ↑↓ navigate · Ctrl+P pause')}</Text>
        {paused ? <Text>{chalk.yellow('PAUSED')} {pendingLog.current.length > 0 ? chalk.dim(`+${pendingLog.current.length}`) : ''}</Text> : null}
      </Box>
      <Text>{'─'.repeat(stdout.columns)}</Text>
      <Box flexDirection="column">
        {displayedLog.map((entry, i) => {
          const selected = cursorIndex === i
          const dim = cursorIndex !== null && !selected
          const prefix = selected ? '›' : ' '
          return (
            <Box key={entry.id}>
              <Box minWidth={2}><Text color="cyan">{prefix}</Text></Box>
              <Box minWidth={8}><Text dimColor={dim}>{entry.method}</Text></Box>
              <Box minWidth={pathColWidth}><Text dimColor={dim}>{entry.path}</Text></Box>
              <Box minWidth={statusColWidth}><Text dimColor={dim}>{entry.status}</Text></Box>
              {entry.runtime ? <Text dimColor={dim}>{entry.runtime}</Text> : null}
            </Box>
          )
        })}
      </Box>
    </Box>
  )
}

export const initDashboard = (
  config: ProfileConfig,
  appEventEmitter: AppEventEmitter,
  allTunnels: TunnelInfo[],
  onSwitchTunnel: (tunnel: TunnelInfo) => void,
): { rerender: (config: ProfileConfig, emitter: AppEventEmitter, tunnels: TunnelInfo[]) => void } => {
  process.stdout.write('\x1b[?1049h') // enter alternate screen buffer
  setCursorVisibility(false)

  const restoreScreen = () => {
    process.stdout.write('\x1b[?1049l') // leave alternate screen buffer
    setCursorVisibility(true)
  }

  process.once('exit', restoreScreen)

  const {rerender} = render(
    <DashboardApp key={config.profileName} config={config} appEventEmitter={appEventEmitter} allTunnels={allTunnels} onSwitchTunnel={onSwitchTunnel}/>,
    {exitOnCtrlC: false},
  )

  return {
    rerender: (newConfig, newEmitter, newTunnels) => {
      rerender(<DashboardApp key={newConfig.profileName} config={newConfig} appEventEmitter={newEmitter} allTunnels={newTunnels} onSwitchTunnel={onSwitchTunnel}/>)
    },
  }
}
