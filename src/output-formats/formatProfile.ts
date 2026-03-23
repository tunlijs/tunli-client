import type {ParsedProfileConfig} from '#config/ParsedProfileConfig'
import {dim, missingColor, proxyColor} from '#output-formats/colors'
import {type Align, col, type ColorFn, heading, row, tableWidth} from '#output-formats/table'
import {formatPath} from '#output-formats/formatPath'

export const formatProfile = (profile: ParsedProfileConfig): string => {
  const lines: string[] = []

  const data = [{
    name: profile.name,
    protocol: profile.protocol ?? '-',
    host: profile.host ?? '-',
    port: profile.port !== undefined ? String(profile.port) : '-',
    proxy: profile.proxy !== undefined ? 'yes' : 'no',
  }]

  const pw = [
    col(data.map(r => r.name), 'NAME'),
    col(data.map(r => r.protocol), 'PROTOCOL'),
    col(data.map(r => r.host), 'HOST'),
    col(data.map(r => r.port), 'PORT'),
    col(data.map(r => r.proxy), 'PROXY'),
  ]
  const pa: Align[] = ['left', 'left', 'left', 'right', 'left']
  const pc: (ColorFn | undefined)[] = [undefined, missingColor, missingColor, missingColor, proxyColor]

  lines.push('')
  lines.push(heading('Profile', tableWidth(pw)))
  lines.push(`${dim('Name')}   ${profile.name}`)
  lines.push(`${dim('File')}   ${profile.filepath ? formatPath(profile.filepath) : '-'}`)
  lines.push(`${dim('Scope')}  ${profile.locationType}`)
  lines.push('')
  lines.push(row(['NAME', 'PROTOCOL', 'HOST', 'PORT', 'PROXY'], pw, pa, pw.map(() => dim)))
  for (const r of data) {
    lines.push(row([r.name, r.protocol, r.host, r.port, r.proxy], pw, pa, pc))
  }

  lines.push('')
  return lines.join('\n')
}
