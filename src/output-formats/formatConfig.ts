import type {ParsedConfig} from '#config/ParsedConfig'
import {type Align, col, type ColorFn, heading, row, tableWidth} from '#output-formats/table'
import {activeColor, dim, missingColor, proxyColor} from '#output-formats/colors'
import {formatPath} from '#output-formats/formatPath'

export const formatConfig = (config: ParsedConfig): string => {
  const lines: string[] = []

  // compute widths upfront
  const profileRows = config.profiles.map(p => ({
    name: p.name,
    protocol: p.protocol ?? '-',
    host: p.host ?? '-',
    port: p.port !== undefined ? String(p.port) : '-',
    proxy: p.proxy !== undefined ? 'yes' : 'no',
  }))
  const pw = [
    col(profileRows.map(r => r.name), 'NAME'),
    col(profileRows.map(r => r.protocol), 'PROTOCOL'),
    col(profileRows.map(r => r.host), 'HOST'),
    col(profileRows.map(r => r.port), 'PORT'),
    col(profileRows.map(r => r.proxy), 'PROXY'),
  ]
  const pa: Align[] = ['left', 'left', 'left', 'right', 'left']
  const pc: (ColorFn | undefined)[] = [undefined, missingColor, missingColor, missingColor, proxyColor]

  const serverRows = config.servers.map(s => ({
    name: s.name,
    url: s.url ?? '-',
    active: s.name === config.activeServer ? '*' : '',
  }))
  const sw = [
    col(serverRows.map(r => r.name), 'NAME'),
    col(serverRows.map(r => r.url), 'URL'),
    col(serverRows.map(r => r.active), 'ACTIVE'),
  ]
  const sc: (ColorFn | undefined)[] = [undefined, missingColor, activeColor]

  const totalWidth = Math.max(tableWidth(pw), tableWidth(sw))

  // Config header
  lines.push('')
  lines.push(heading('Config', totalWidth))
  lines.push(`${dim('Path')}   ${config.filepath ? formatPath(config.filepath) : '-'}`)
  lines.push(`${dim('Type')}   ${config.mode}`)

  // Profiles table
  lines.push('')
  lines.push('')
  lines.push(heading('Profiles', totalWidth))
  lines.push(row(['NAME', 'PROTOCOL', 'HOST', 'PORT', 'PROXY'], pw, pa, pw.map(() => dim)))
  for (const r of profileRows) {
    lines.push(row([r.name, r.protocol, r.host, r.port, r.proxy], pw, pa, pc))
  }

  // Servers table
  lines.push('')
  lines.push('')
  lines.push(heading('Servers', totalWidth))
  lines.push(row(['NAME', 'URL', 'ACTIVE'], sw, [], sw.map(() => dim)))
  for (const r of serverRows) {
    lines.push(row([r.name, r.url, r.active], sw, [], sc))
  }

  lines.push('')
  return lines.join('\n')
}
