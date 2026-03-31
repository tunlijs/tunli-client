import {argv, stdout} from 'node:process'
import EventEmitter from "node:events"
import {spawn} from "child_process"
import type {Logger} from "#types/types";

export const setCursorVisibility = (visible: boolean) => {
  if (visible) {
    stdout.write('\x1B[?25h');
  } else {
    stdout.write('\x1B[?25l');
  }
}

export const clearTerminal = () => {
  stdout.write('\x1B[2J\x1B[0f');
}


interface ProxyOptions {
  sea?: boolean
  env?: Record<string, string>
  onBeforeRestart?: () => Promise<void>
}

export const proxyChildProcess = (
  logger: Logger,
  pathToExecutable: string,
  proxyArguments: string[] = argv.slice(2),
  options: ProxyOptions = {}
) => {
  const command = options.sea ? pathToExecutable : 'node'
  const args = options.sea ? proxyArguments : [pathToExecutable, ...proxyArguments]
  const env = options.env ? {...process.env, ...options.env} : undefined

  const eventEmitter = new EventEmitter()
  const createSpawnProcessPromise = () => {
    logger.debug('Lifecycle: Initializing child process spawn...')
    const onError = (error: Error) => {
      logger.debug(`Lifecycle: Spawn failed or process encountered an error: ${error.message}`)
      eventEmitter.emit('close', 1)
    }

    const onClose = (code: number | null) => {
      if (code === null) {
        logger.debug('Lifecycle: Child process was terminated externally (SIGKILL/SIGTERM).')
        clearTerminal()
      } else {
        logger.debug(`Lifecycle: Child process exited with code ${code}`)
      }
      eventEmitter.emit('close', code)
    }

    const onMessage = (message: string) => {
      logger.debug(`Received IPC message: ${message}`)

      if (message === 'restart') {
        child.off('close', onClose)
        child.kill()
        const doRestart = async () => {
          logger.debug('Lifecycle: Child process termination signal sent. Preparing restart hooks...')
          await options.onBeforeRestart?.()
          logger.debug('Lifecycle: Restart hooks completed. Emitting spawn event for new process.')
          eventEmitter.emit('spawn')
        }
        void doRestart()
      }
    }

    const child = spawn(command, args, {
      stdio: ['inherit', 'inherit', 'inherit', 'ipc'],
      env,
    })
      .on('close', onClose)
      .on('error', onError)
      .on('message', onMessage)

    if (child.pid) {
      logger.debug(`Lifecycle: Child process successfully started (PID: ${child.pid})`)
    }
  }

  eventEmitter.on('spawn', () => createSpawnProcessPromise())

  return new Promise((resolve) => {
    eventEmitter.once('close', resolve)
    eventEmitter.emit('spawn')
  })
}
