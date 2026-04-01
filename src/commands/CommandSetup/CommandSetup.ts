import {Command} from '#commander/index'
import type {Context} from '#types/types'
import {DEFAULT_API_SERVER_URL, DEFAULT_PROFILE_NAME, DEFAULT_SERVER_NAME, LOCAL_CONFIG_FILEPATH} from '#lib/defs'
import {confirm, prompt, promptPort, promptProtocol, promptUrl} from '#commands/utils'
import {validateProfileConfig} from '#config/validations/validateProfileConfig'
import {createLocalConfig} from '#config/utils'
import {ParsedLocalConfig} from '#config/ParsedLocalConfig'
import {encodePublicKey, ensureIdentity, fingerprint, loadIdentity} from '#identity/identity'

export const createCommandSetup = (ctx: Context, _program: Command) => {
  const cmd = new Command('setup')
    .description('Interactive setup wizard for first-time configuration and profile creation')

  cmd.action(async () => {
    ctx.stdOut('tunli setup — interactive configuration wizard\n')

    // ── Step 1: Relay ─────────────────────────────────────────────────────────
    ctx.stdOut('Step 1/5 — Relay')
    const relayUrl = await promptUrl('  Relay URL', DEFAULT_API_SERVER_URL)
    const serverName = ctx.config.global.activeServer ?? DEFAULT_SERVER_NAME
    const serverConf = ctx.config.global.server(serverName)

    if (!serverConf.exists() || !serverConf.authToken) {
      ctx.stdOut('  No account found. Registering...')
      const {data, error} = await ctx.apiClient.register(relayUrl)
      if (error || !data) {
        ctx.stdErr(`  Registration failed: ${error?.message ?? 'unknown error'}`)
        ctx.stdErr('  Run `tunli register` manually and then re-run `tunli setup`.')
        return ctx.exit(1)
      }
      if (!ctx.config.global.activeServer) ctx.config.global.activeServer = serverName
      serverConf.setUrl(relayUrl).setAuthToken(data).save()
      const isNew = loadIdentity() === null
      const identity = ensureIdentity()
      ctx.stdOut(`  ✓ Registered with ${relayUrl}`)
      if (isNew) {
        ctx.stdOut(`  ✓ Identity: ${encodePublicKey(identity.publicKeyRaw)} (${fingerprint(identity.publicKeyRaw)})`)
      }
    } else {
      if (serverConf.url !== relayUrl) serverConf.setUrl(relayUrl).save()
      ctx.stdOut(`  ✓ Registered with ${relayUrl}`)
    }

    // ── Step 2: Config location ───────────────────────────────────────────────
    ctx.stdOut('\nStep 2/5 — Config location')
    let localConf: ParsedLocalConfig | undefined

    if (ctx.config.local) {
      ctx.stdOut(`  ✓ Using local config at ${ctx.config.local.filepath}`)
      localConf = ctx.config.local
    } else {
      const createLocal = await confirm('  No local config found. Create one in the current directory? [y/N] ')
      if (createLocal) {
        createLocalConfig(LOCAL_CONFIG_FILEPATH)
        ctx.config.global.registerLocalConfig(LOCAL_CONFIG_FILEPATH)
        ctx.config.global.save()
        ctx.stdOut(`  ✓ Created ${LOCAL_CONFIG_FILEPATH}`)
        localConf = new ParsedLocalConfig({}, LOCAL_CONFIG_FILEPATH)
      } else {
        ctx.stdOut('  Using global config (~/.tunli/config.json).')
      }
    }

    const activeConfig = localConf ?? ctx.config.global

    // ── Step 3: Profile name ──────────────────────────────────────────────────
    ctx.stdOut('\nStep 3/5 — Profile')
    const createProfile = await confirm('  Create a tunnel profile? [y/N] ')
    if (!createProfile) {
      ctx.stdOut('\nSetup complete. Run `tunli setup` again to add a profile later.')
      return
    }

    let profileName: string
    while (true) {
      profileName = await prompt('  Name', DEFAULT_PROFILE_NAME)
      if (!profileName) { ctx.stdOut('  Profile name cannot be empty.'); continue }
      const existing = activeConfig.profile(profileName)
      if (existing.exists()) {
        const overwrite = await confirm(`  Profile "${profileName}" already exists. Overwrite? [y/N] `)
        if (!overwrite) continue
      }
      break
    }
    const targetConfig = activeConfig.profile(profileName)

    // ── Step 4: Target ────────────────────────────────────────────────────────
    ctx.stdOut('\nStep 4/5 — Target (your local service)')

    const protocol = await promptProtocol('  Protocol (http/https)', 'http')
    const host = await prompt('  Host', 'localhost')
    const port = await promptPort('  Local port (e.g. 3000)')

    targetConfig.protocol = protocol
    targetConfig.setHost(host)
    targetConfig.setPort(port)

    // ── Step 5: Access control (optional) ────────────────────────────────────
    ctx.stdOut('\nStep 5/5 — Access control (optional)')
    const restrictAccess = await confirm('  Restrict access by IP? [y/N] ')
    if (restrictAccess) {
      const raw = await prompt('  Allowed CIDRs (comma-separated, e.g. 192.168.1.0/24)')
      const cidrs = raw.split(',').map(s => s.trim()).filter(Boolean)
      if (cidrs.length > 0) {
        targetConfig.allowCidr = cidrs
        ctx.stdOut(`  ✓ Allow-list: ${cidrs.join(', ')}`)
      } else {
        ctx.stdOut('  No CIDRs entered — skipping access control.')
      }
    }

    // ── Register proxy & save ─────────────────────────────────────────────────
    ctx.stdOut('\nRegistering proxy with relay...')
    const validated = await validateProfileConfig(ctx, targetConfig)
    targetConfig.save()

    const targetUrl = `${validated.target.protocol}://${validated.target.host}:${validated.target.port}`
    ctx.stdOut(`  ✓ ${validated.proxy.proxyURL} → ${targetUrl}`)
    ctx.stdOut(`\nProfile "${validated.profileName}" saved to ${targetConfig.filepath}`)
    ctx.stdOut(`\nStart your tunnel:`)
    ctx.stdOut(`  tunli use ${validated.profileName}`)
    if (localConf) {
      ctx.stdOut(`\nOr start all profiles in this project:`)
      ctx.stdOut(`  tunli up`)
    }
  })

  cmd.extendUsage()
  cmd.addExample('setup', 'Run the interactive setup wizard')

  return cmd
}
