import chalk from 'chalk'

export const dim = chalk.dim.bind(chalk)
export const green = chalk.green.bind(chalk)

export const proxyColor = (v: string): string => v === 'yes' ? green(v.padEnd(5)) : dim(v.padEnd(5))
export const missingColor = (v: string): string => v.trim() === '-' ? dim(v) : v
export const activeColor = (v: string): string => v.trim() === '*' ? chalk.green.bold(v) : v

export const bold = chalk.bold.bind(chalk)
