import {exec} from 'node:child_process'
import {createWriteStream, mkdirSync} from 'node:fs'
import {chmod, copyFile, unlink} from 'node:fs/promises'
import {tmpdir} from 'node:os'
import {join} from 'node:path'
import {pipeline} from 'node:stream/promises'
import {Readable} from 'node:stream'
import {RELEASE_DOWNLOAD_BASE_URL, TUNLI_BIN_DIR, TUNLI_BIN_NEW_PATH} from '#lib/defs'
import type {UpdateResult} from "#cli-app/types";

const PLATFORM_ASSET: Partial<Record<NodeJS.Platform, string>> = {
  linux: 'tunli-main-linux.tar.gz',
  darwin: 'tunli-main-macos.tar.gz',
}

export const downloadBinaryUpdate = async (onComplete: (result: UpdateResult) => void): Promise<boolean> => {
  const asset = PLATFORM_ASSET[process.platform]
  if (!asset) {
    onComplete({status: 'failed', reason: `Unsupported platform: ${process.platform}`})
    return false
  }

  const url = `${RELEASE_DOWNLOAD_BASE_URL}/${asset}`
  const tmpTar = join(tmpdir(), asset)
  const tmpBin = join(tmpdir(), 'tunli-main')

  const cleanup = async () => {
    await unlink(tmpTar).catch(() => undefined)
    await unlink(tmpBin).catch(() => undefined)
  }

  try {
    onComplete({status: 'progress', message: 'Downloading...'})
    const response = await fetch(url)
    if (!response.ok || !response.body) throw new Error(`Download failed: ${response.status}`)
    await pipeline(Readable.fromWeb(response.body), createWriteStream(tmpTar))

    onComplete({status: 'progress', message: 'Extracting...'})
    await new Promise<void>((resolve, reject) => {
      exec(`tar -xzf "${tmpTar}" -C "${tmpdir()}"`, err => err ? reject(err) : resolve())
    })

    onComplete({status: 'progress', message: 'Preparing...'})
    await chmod(tmpBin, 0o755).catch((e: NodeJS.ErrnoException) => {
      if (e.code === 'ENOENT') throw new Error('Extracted binary not found — the release archive may be corrupted')
      throw e
    })
    mkdirSync(TUNLI_BIN_DIR, {recursive: true})
    await copyFile(tmpBin, TUNLI_BIN_NEW_PATH)

    await cleanup()
    onComplete({status: 'success'})
    return true
  } catch (e) {
    await cleanup()
    onComplete({status: 'failed', reason: e instanceof Error ? e.message : String(e)})
  }
  return false
}
