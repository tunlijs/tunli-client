import {test, describe} from 'node:test'
import assert from 'node:assert/strict'
import {spawnSync} from 'node:child_process'
import {mkdtempSync, rmSync, readFileSync} from 'node:fs'
import {tmpdir} from 'node:os'
import {join, resolve} from 'node:path'

const BIN = resolve(import.meta.dirname, '../bin/tunli')
const {version} = JSON.parse(readFileSync(resolve(import.meta.dirname, '../package.json'), 'utf8'))

// bin/tunli is plain JS and not type-checked by tsc — this smoke test catches signature drift
describe('bin/tunli', () => {
  test('starts and prints the version', () => {
    const home = mkdtempSync(join(tmpdir(), 'tunli-bin-test-'))
    try {
      const res = spawnSync(process.execPath, [BIN, '--version'], {
        env: {...process.env, HOME: home, USERPROFILE: home},
        encoding: 'utf8',
        timeout: 15000,
      })
      assert.equal(res.status, 0, res.stderr)
      assert.match(res.stdout, new RegExp(`tunli: ${version.replace(/\./g, '\\.')}`))
    } finally {
      rmSync(home, {recursive: true, force: true})
    }
  })
})
