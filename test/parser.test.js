import {test, describe} from 'node:test'
import assert from 'node:assert/strict'
import {parse, ParseError} from '../dist/commands/helper/Parser.js'

// Minimal command structure for testing
const root = {
  type: 'command',
  name: 'tunli',
  children: [
    {type: 'argument', name: 'url', required: false},
    {
      type: 'command',
      name: 'http',
      isDefault: true,
      children: [
        {type: 'argument', name: 'port', required: true, parse: Number},
        {type: 'argument', name: 'host', required: false},
        {type: 'option', name: 'save', argument: 'profile'},
        {type: 'option', name: 'global', short: 'g'},
      ]
    },
    {
      type: 'command',
      name: 'https',
      children: [
        {type: 'argument', name: 'port', required: true, parse: Number},
        {type: 'argument', name: 'host', required: false},
        {type: 'option', name: 'save', argument: 'profile'},
        {type: 'option', name: 'global', short: 'g'},
      ]
    },
    {
      type: 'command',
      name: 'start',
      aliasPrefix: '@',
      children: [
        {type: 'argument', name: 'profile', required: true},
        {type: 'option', name: 'allow-cidr', key: 'allow-cidr', short: 'a', argument: 'cidr', many: true},
        {type: 'option', name: 'allow', key: 'allow-cidr', argument: 'cidr', many: true},
      ]
    },
    {
      type: 'command',
      name: 'config',
      children: [
        {
          type: 'command',
          name: 'set',
          requires: ({command, option}) => ({command: !option, option: !command}),
          children: [
            {type: 'option', name: 'port', argument: 'port', parse: Number},
            {type: 'command', name: 'port', children: [{type: 'argument', name: 'port', required: true, parse: Number}]},
          ]
        },
      ]
    },
    {
      type: 'command',
      name: 'tags',
      children: [
        {type: 'argument', name: 'tag', required: false, many: true},
      ]
    },
  ]
}

const argv = (...args) => ['node', 'tunli', ...args]

describe('command matching', () => {
  test('matches subcommand', () => {
    const r = parse(argv('http', '3000'), root)
    assert.deepEqual(r.command, ['tunli', 'http'])
    assert.equal(r.args.port, 3000)
  })

  test('matches nested subcommand', () => {
    const r = parse(argv('config', 'set', 'port', '8080'), root)
    assert.deepEqual(r.command, ['tunli', 'config', 'set', 'port'])
    assert.equal(r.args.port, 8080)
  })

  test('default child receives unmatched positional', () => {
    const r = parse(argv('3000'), root)
    assert.deepEqual(r.command, ['tunli', 'http'])
    assert.equal(r.args.port, 3000)
  })

  test('unknown command throws with helpful message', () => {
    assert.throws(
      () => parse(argv('config', 'wrongcmd'), root),
      (e) => e instanceof ParseError && /Unknown command: wrongcmd/.test(e.message)
    )
  })
})

describe('alias prefix (@)', () => {
  test('@profile expands to start <profile>', () => {
    const r = parse(argv('@myapp'), root)
    assert.deepEqual(r.command, ['tunli', 'start'])
    assert.equal(r.args.profile, 'myapp')
  })
})

describe('URL preprocessing', () => {
  test('http://localhost:3000 → http 3000 localhost', () => {
    const r = parse(argv('http://localhost:3000'), root)
    assert.deepEqual(r.command, ['tunli', 'http'])
    assert.equal(r.args.port, 3000)
    assert.equal(r.args.host, 'localhost')
  })

  test('http://example.com (no port) → port 80', () => {
    const r = parse(argv('http://example.com'), root)
    assert.equal(r.args.port, 80)
  })

  test('https://example.com (no port) → port 443', () => {
    const r = parse(argv('https://example.com'), root)
    assert.equal(r.args.port, 443)
  })
})

describe('options', () => {
  test('long option with value', () => {
    const r = parse(argv('http', '3000', '--save', 'myapp'), root)
    assert.equal(r.options.save, 'myapp')
  })

  test('short flag', () => {
    const r = parse(argv('http', '3000', '-g'), root)
    assert.equal(r.options.global, true)
  })

  test('variadic option — repeated flag accumulates', () => {
    const r = parse(argv('start', 'myapp', '--allow-cidr', '10.0.0.0/8', '--allow-cidr', '192.168.0.0/16'), root)
    assert.deepEqual(r.options['allow-cidr'], ['10.0.0.0/8', '192.168.0.0/16'])
  })

  test('variadic option — alias and short accumulate into same key', () => {
    const r = parse(
      argv('start', 'myapp', '--allow-cidr', '1.1.1.1', '--allow-cidr', '2.2.2.2', '--allow', '3.3.3.3', '-a', '4.4.4.4', '-a', '5.5.5.5'),
      root
    )
    assert.deepEqual(r.options['allow-cidr'], ['1.1.1.1', '2.2.2.2', '3.3.3.3', '4.4.4.4', '5.5.5.5'])
  })

  test('unknown long option throws', () => {
    assert.throws(
      () => parse(argv('http', '3000', '--typo'), root),
      (e) => e instanceof ParseError && /Unknown option/.test(e.message)
    )
  })

  test('unknown short option throws', () => {
    assert.throws(
      () => parse(argv('http', '3000', '-z'), root),
      (e) => e instanceof ParseError && /Unknown option/.test(e.message)
    )
  })
})

describe('arguments', () => {
  test('required argument missing throws', () => {
    assert.throws(
      () => parse(argv('http'), root),
      (e) => e instanceof ParseError && /Missing required argument/.test(e.message)
    )
  })

  test('parse callback transforms value', () => {
    const r = parse(argv('http', '3000'), root)
    assert.equal(typeof r.args.port, 'number')
  })

  test('variadic argument', () => {
    const r = parse(argv('tags', 'a', 'b', 'c'), root)
    assert.deepEqual(r.args.tag, ['a', 'b', 'c'])
  })

  test('optional argument absent', () => {
    const r = parse(argv('http', '3000'), root)
    assert.equal(r.args.host, undefined)
  })
})

describe('help', () => {
  test('--help sets help flag', () => {
    const r = parse(argv('--help'), root)
    assert.equal(r.help, true)
  })

  test('-h sets help flag', () => {
    const r = parse(argv('-h'), root)
    assert.equal(r.help, true)
  })

  test('subcommand --help carries command path', () => {
    const r = parse(argv('http', '--help'), root)
    assert.equal(r.help, true)
    assert.deepEqual(r.command, ['tunli', 'http'])
  })
})

describe('requires()', () => {
  test('requires option or subcommand — subcommand satisfies', () => {
    const r = parse(argv('config', 'set', 'port', '8080'), root)
    assert.deepEqual(r.command, ['tunli', 'config', 'set', 'port'])
  })

  test('requires option or subcommand — option satisfies', () => {
    const r = parse(argv('config', 'set', '--port', '8080'), root)
    assert.equal(r.options.port, 8080)
  })

  test('requires option or subcommand — neither throws', () => {
    assert.throws(
      () => parse(argv('config', 'set'), root),
      (e) => e instanceof ParseError
    )
  })
})

describe('ParseError', () => {
  test('carries commandPath for missing argument', () => {
    assert.throws(
      () => parse(argv('http'), root),
      (e) => e instanceof ParseError && e.commandPath.join(' ') === 'tunli http'
    )
  })
})
