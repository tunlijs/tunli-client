import {useState} from 'react'
import {Box, render, Text, useApp, useInput} from 'ink'
import type {TunnelInfo} from '#daemon/protocol'

const TunnelPickerApp = ({tunnels, onSelect}: {tunnels: TunnelInfo[]; onSelect: (t: TunnelInfo) => void}) => {
  const {exit} = useApp()
  const [index, setIndex] = useState(0)

  useInput((_, key) => {
    if (key.upArrow) setIndex(i => Math.max(0, i - 1))
    if (key.downArrow) setIndex(i => Math.min(tunnels.length - 1, i + 1))
    if (key.return) {
      const selected = tunnels[index]
      if (selected) onSelect(selected)
      exit()
    }
    if (key.escape) exit()
  })

  return (
    <Box flexDirection="column" padding={1}>
      <Text bold>Select tunnel</Text>
      <Text> </Text>
      {tunnels.map((t, i) => (
        <Box key={t.profileName}>
          <Box minWidth={2}><Text color="cyan">{i === index ? '›' : ' '}</Text></Box>
          <Box minWidth={24}><Text bold={i === index}>{t.profileName}</Text></Box>
          <Text dimColor>{t.proxyURL} → {t.target}</Text>
        </Box>
      ))}
      <Text> </Text>
      <Text dimColor>↑↓ navigate · Enter select · Esc cancel</Text>
    </Box>
  )
}

export const pickTunnel = (tunnels: TunnelInfo[]): Promise<TunnelInfo | null> =>
  new Promise(resolve => {
    let selected: TunnelInfo | null = null
    const {waitUntilExit} = render(
      <TunnelPickerApp tunnels={tunnels} onSelect={t => { selected = t }}/>,
    )
    void waitUntilExit().then(() => resolve(selected)).catch(() => resolve(null))
  })
