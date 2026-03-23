import {argv, stdout} from 'node:process'
import EventEmitter from "node:events"
import {spawn} from "child_process"
import {logDebug} from "#logger/logger"

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
  pathToExecutable: string,
  proxyArguments: string[] = argv.slice(2),
  options: ProxyOptions = {}
) => {
  const command = options.sea ? pathToExecutable : 'node'
  const args = options.sea ? proxyArguments : [pathToExecutable, ...proxyArguments]
  const env = options.env ? {...process.env, ...options.env} : undefined

  const eventEmitter = new EventEmitter()
  const createSpawnProcessPromise = () => {
    logDebug('Lifecycle: Initializing child process spawn...')
    const onError = (error: Error) => {
      logDebug(`Lifecycle: Spawn failed or process encountered an error: ${error.message}`)
      eventEmitter.emit('close', 1)
    }

    const onClose = (code: number | null) => {
      if (code === null) {
        logDebug('Lifecycle: Child process was terminated externally (SIGKILL/SIGTERM).')
        clearTerminal()
      } else {
        logDebug(`Lifecycle: Child process exited with code ${code}`)
      }
      eventEmitter.emit('close', code)
    }

    const onMessage = (message: string) => {
      logDebug(`Received IPC message: ${message}`)

      if (message === 'restart') {
        child.off('close', onClose)
        child.kill()
        const doRestart = async () => {
          logDebug('Lifecycle: Child process termination signal sent. Preparing restart hooks...')
          await options.onBeforeRestart?.()
          logDebug('Lifecycle: Restart hooks completed. Emitting spawn event for new process.')
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
      logDebug(`Lifecycle: Child process successfully started (PID: ${child.pid})`)
    }
  }

  eventEmitter.on('spawn', () => createSpawnProcessPromise())

  return new Promise((resolve) => {
    eventEmitter.once('close', resolve)
    eventEmitter.emit('spawn')
  })
}
