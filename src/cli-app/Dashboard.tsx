import {useState, useEffect} from 'react'
import {render, Box, Text, useInput, useApp, useStdout} from 'ink'
import chalk from 'chalk'
import QRCode from 'qrcode'
import type {ProfileConfig} from '#types/types'
import type {AppEventEmitter} from '#cli-app/AppEventEmitter'
import {readPackageJson} from '#package-json/packageJson'
import {setCursorVisibility} from '#utils/cliFunctions'
import {getAvailableUpdate, performUpdate} from '#cli-app/versionCheck'
import {CHECK_FOR_UPDATES} from "#lib/defs";

type LogEntry = {
  method: string
  path: string
  status: string
  id: number
}

const SPINNER_CHARS = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'] as const

const Spinner = ({spinning}: {spinning: boolean}) => {
  const [index, setIndex] = useState(0)

  useEffect(() => {
    if (!spinning) return
    const id = setInterval(() => setIndex(i => (i + 1) % SPINNER_CHARS.length), 100)
    return () => clearInterval(id)
  }, [spinning])

  return <Text>{spinning ? (SPINNER_CHARS[index] ?? ' ') : ' '}</Text>
}

const InfoRow = ({label, value}: {label: string, value: string}) => (
  <Box>
    <Box minWidth={30}><Text>{label}</Text></Box>
    <Text>{value}</Text>
  </Box>
)

const QRModal = ({text, onClose}: {text: string, onClose: () => void}) => {
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

type DashboardAppProps = {
  config: ProfileConfig
  appEventEmitter: AppEventEmitter
}

const DashboardApp = ({config, appEventEmitter}: DashboardAppProps) => {
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
      .on('response', (req, res) => {
        let rspMsg = `${res.statusCode} ${res.statusMessage}`
        if (res.statusCode >= 500) rspMsg = chalk.red(rspMsg)
        else if (res.statusCode >= 400) rspMsg = chalk.blueBright(rspMsg)
        else rspMsg = chalk.green(rspMsg)
        rspMsg = chalk.bold(rspMsg)
        setRequestCount(c => c + 1)
        setAccessLog(log => [...log, {
          method: req.method,
          path: req.path,
          status: rspMsg,
          id: Date.now()
        }].slice(-30))
      })
      .on('client-blocked', (ip) => {
        setBlockedCount(c => c + 1)
        setLastBlockedIp(ip)
      })
      .on('latency', (ms) => setLatency(ms))
      .on('request-count', (count) => setRequestCount(count))
  }, [])

  // Ctrl+C always active (even when QR modal is open)
  useInput((input, key) => {
    if (key.ctrl && input === 'c') {
      exit()
      process.exit(0)
    }
  })

  useInput((input, key) => {
    if (key.ctrl && input === 'r') {
      process.send?.('restart')
    }
    if (key.ctrl && input === 'q') {
      QRCode.toString(config.proxy.proxyURL, {type: 'terminal'}, (err, url) => {
        if (!err) setQrText(url)
      })
    }
    if (key.ctrl && input === 'u' && latestVersion && !updatingPackage && packageJson) {
      setUpdatingPackage(true)
      setAvailableUpdate(chalk.yellow('Updating...'))
      performUpdate(packageJson.name, (success) => {
        setUpdatingPackage(false)
        if (success) {
          setAvailableUpdate(chalk.green('Update done. Please restart tunli. (Ctrl+R to restart)'))
        } else {
          setAvailableUpdate(chalk.red('Update failed.'))
        }
      })
    }
  }, {isActive: qrText === null})

  const allowedCidr = config.allowedCidr.length ? config.allowedCidr : null
  const deniedCidr = config.deniedCidr.length ? config.deniedCidr : null

  if (qrText !== null) {
    return <QRModal text={qrText} onClose={() => setQrText(null)} />
  }

  return (
    <Box flexDirection="column" height={stdout.rows}>
      <Box width="100%" justifyContent="space-between">
        <Box>
          <Text>tunli </Text>
          <Spinner spinning={spinning} />
        </Box>
        <Text>(Ctrl+C to quit)</Text>
      </Box>
      <Box marginTop={1} flexDirection="column">
        <InfoRow label="Tunnel" value={connectionStatus} />
        {packageJson ? <InfoRow label="Version" value={packageJson.version} /> : null}
        {availableUpdate ? <InfoRow label={chalk.yellow('Update')} value={availableUpdate} /> : null}
        <InfoRow label="Profile" value={config.profileName} />
        <InfoRow label="Config" value={config.filepath} />
        <InfoRow label="QR-Code" value="Ctrl-Q" />
        {(allowedCidr ?? deniedCidr) ? <Text> </Text> : null}
        {allowedCidr ? <InfoRow label="Allowed" value={allowedCidr.join(', ')} /> : null}
        {deniedCidr ? <InfoRow label="Denied" value={deniedCidr.join(', ')} /> : null}
        {(allowedCidr ?? deniedCidr) ? (
          <InfoRow label="Blocked" value={`${blockedCount}${lastBlockedIp ? ` (${lastBlockedIp})` : ''}`} />
        ) : null}
        <Text> </Text>
        <InfoRow label="Latency" value={latency !== null ? `${latency}ms` : '—'} />
        <InfoRow label="Forwarding" value={forwardingUrl} />
        <InfoRow label="Connections" value={String(requestCount)} />
      </Box>
      <Text> </Text>
      <Text> </Text>
      <Text>HTTP Requests</Text>
      <Text>{'─'.repeat(stdout.columns)}</Text>
      <Box flexDirection="column">
        {[...accessLog].reverse().map(entry => (
          <Box key={entry.id}>
            <Box minWidth={8}><Text>{entry.method}</Text></Box>
            <Box minWidth={30}><Text>{entry.path}</Text></Box>
            <Text>{entry.status}</Text>
          </Box>
        ))}
      </Box>
    </Box>
  )
}

export const initDashboard = (config: ProfileConfig, appEventEmitter: AppEventEmitter) => {
  process.stdout.write('\x1b[?1049h') // enter alternate screen buffer
  setCursorVisibility(false)

  const restoreScreen = () => {
    process.stdout.write('\x1b[?1049l') // leave alternate screen buffer
    setCursorVisibility(true)
  }

  process.once('exit', restoreScreen)

  render(<DashboardApp config={config} appEventEmitter={appEventEmitter} />, {exitOnCtrlC: false})
}
