import {resolve} from 'node:path'
import {Argument, Command, Option, type ParseResult} from '#commander/index'
import type {Context} from '#types/types'
import {resolveConfig} from '#commands/CommandConfig/utils/resolveConfig'
import {validateProfileConfig} from '#config/validations/validateProfileConfig'
import {AppEventEmitter} from '#cli-app/AppEventEmitter'
import {createProxy} from '#proxy/Proxy'
import {startReceiveServer} from '#receive/ReceiveServer'

export const createCommandReceive = (ctx: Context, _program: Command) => {
  const cmd = new Command('receive')
    .description('Receive files through a temporary browser upload page')
    .addArgument(new Argument('directory', 'Directory in which to save uploads (default: current directory)').default('.'))
    .addOption(new Option('once', 'Stop after one successful upload'))
    .addOption(new Option('max-size', 'Maximum size per file in MB (default: 10240)').argument('MB').parse(value => {
      const mb = Number(value)
      if (!Number.isSafeInteger(mb) || mb < 1 || mb > Math.floor(Number.MAX_SAFE_INTEGER / 1024 / 1024)) {
        throw new Error('Expected a positive whole number of MB')
      }
      return mb
    }))

  cmd.extendUsage()
  cmd.addExample('receive', 'Start a temporary upload page for the current directory')
  cmd.addExample('receive ~/uploads', 'Start a temporary upload page for ~/uploads')
  cmd.addExample('receive ~/uploads --once', 'Stop after one successful upload')
  cmd.addExample('receive ~/uploads --max-size 4096', 'Allow files up to 4096 MB')

  cmd.action(async ({args, options}: ParseResult) => {
    const directory = resolve(args.directory as string)
    const once = options.once === true
    const maxBytes = ((options.maxSize as number | undefined) ?? 10240) * 1024 * 1024
    let stop: (() => Promise<void>) | undefined
    try {
      const receiver = await startReceiveServer(directory, {
        once,
        maxBytes,
        onUpload: (name, bytes) => ctx.stdOut(`✓ Received ${name} (${bytes} bytes)`),
        onOnceComplete: () => setTimeout(() => {void stop?.().then(() => process.exit(0))}, 2000),
      })
      let proxy: Awaited<ReturnType<typeof createProxy>> | undefined
      stop = async () => {
        proxy?.disconnect()
        await receiver.close()
      }
      const config = resolveConfig(ctx, {profile: ''}, 'save')
      config.update({protocol: 'http', host: '127.0.0.1', port: receiver.port})
      const validated = await validateProfileConfig(ctx, config)
      const events = new AppEventEmitter()
      proxy = await createProxy(validated, events)
      const connected = new Promise<void>((resolve, reject) => {
        const timer = setTimeout(() => reject(new Error('Tunnel connection timed out')), 20000)
        events.once('connect', () => {clearTimeout(timer); resolve()})
        events.once('connect_error', (error: Error) => {clearTimeout(timer); reject(error)})
      })
      await connected
      const url = new URL(validated.proxy.proxyURL)
      url.pathname = receiver.path
      url.search = ''
      url.hash = ''
      ctx.stdOut(`✓ Receiving into ${directory}`)
      ctx.stdOut(`✓ Upload URL: ${url}`)
      ctx.stdOut('Waiting for uploads... (Ctrl+C to stop)')
      process.once('SIGINT', () => {void stop?.().then(() => process.exit(0))})
      process.once('SIGTERM', () => {void stop?.().then(() => process.exit(0))})
    } catch (error) {
      await stop?.()
      ctx.stdErr(`Could not start receiver: ${error instanceof Error ? error.message : String(error)}`)
      process.exitCode = 1
    }
  })
  return cmd
}
