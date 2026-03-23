import chalk from 'chalk'

export type Align = 'left' | 'right'
export type ColorFn = (s: string) => string

export const col = (values: string[], header: string): number =>
  Math.max(header.length, ...values.map(v => v.length))

export const row = (cells: string[], widths: number[], aligns: Align[] = [], colors: (ColorFn | undefined)[] = []): string =>
  cells.map((c, i) => {
    const w = widths[i] ?? 0
    const padded = aligns[i] === 'right' ? c.padStart(w) : c.padEnd(w)
    return colors[i]?.(padded) ?? padded
  }).join('   ').trimEnd()

export const separator = (widths: number[]): string =>
  widths.map(w => '-'.repeat(w)).join('---')

export const tableWidth = (widths: number[]): number =>
  widths.reduce((sum, w) => sum + w, 0) + (widths.length - 1) * 3

export const heading = (title: string, total: number): string => {
  const prefix = `=== ${title} `
  const width = Math.max(total, prefix.length + 4)
  return chalk.bold(prefix + '='.repeat(width - prefix.length))
}
