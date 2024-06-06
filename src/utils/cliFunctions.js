import {stdout} from 'node:process';
import EventEmitter from "node:events";
import {spawn} from "child_process";

export const setCursorVisibility = (visible) => {
  if (visible) {
    stdout.write('\x1B[?25h');
  } else {
    stdout.write('\x1B[?25l');
  }
}

export const clearTerminal = () => {
  stdout.write('\x1B[2J\x1B[0f');
}


/**
 * Runs a child process and proxies its output.
 * @param {string} pathToExecutable - Relative or absolute path to the executable script
 * @returns {Promise<number|null>} - Exit code of the child process
 */
export const proxyChildProcess = (pathToExecutable) => {

  const eventEmitter = new EventEmitter()
  const createSpawnProcessPromise = () => {
    const onError = (error) => {
      eventEmitter.emit('close', 1)
    }

    const onClose = (code) => {
      if (code === null) {
        clearTerminal()
      }
      eventEmitter.emit('close', code)
    }

    const onMessage = (message) => {
      if (message === 'restart') {
        child.off('close', onClose)
        child.kill()
        setTimeout(() => {
          eventEmitter.emit('spawn')
        }, 10)
      }
    }

    const child = spawn('node', [pathToExecutable], {
      stdio: ['inherit', 'inherit', 'inherit', 'ipc'] // Proxy standard output and error to the main process, enable IPC channel
    })
      .on('close', onClose)
      .on('error', onError)
      .on('message', onMessage)
  }

  eventEmitter.on('spawn', () => createSpawnProcessPromise(pathToExecutable))

  return new Promise((resolve) => {
    eventEmitter.once('close', resolve)
    eventEmitter.emit('spawn')
  })
}
