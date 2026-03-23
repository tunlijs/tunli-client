import type {Context, ProfileConfig, ServerConfig, TargetConfig} from "#types/types";
import type {ParsedProfileConfig} from "#config/ParsedProfileConfig";
import {DEFAULT_PROFILE_NAME, DEFAULT_SERVER_NAME} from "#lib/defs";
import type {ParsedServerConfig} from "#config/ParsedServerConfig";
import {assertHost, assertPort, assertProtocol} from "#utils/assertFunctions";


function validateServerConfig(ctx: Context, config: ParsedServerConfig): ServerConfig {
  if (!config.exists() || !config.authToken || !config.url) {
    ctx.logger.error(`Not registered with relay "${config.name}". Run \`tunli register\` to get started.`)
    return ctx.exit(1)
  }

  return {
    url: config.url,
    authToken: config.authToken
  }
}

function validateTarget(ctx: Context, config: ParsedProfileConfig): TargetConfig {

  const protocol = config.protocol
  const host = config.host
  const port = config.port

  try {
    assertProtocol(protocol)
  } catch (e) {
    ctx.logger.error(e instanceof Error ? e.message : String(e))
    return ctx.exit(1)
  }
  try {
    assertHost(host)
  } catch (e) {
    ctx.logger.error(e instanceof Error ? e.message : String(e))
    return ctx.exit(1)
  }
  try {
    assertPort(port)
  } catch (e) {
    ctx.logger.error(e instanceof Error ? e.message : String(e))
    return ctx.exit(1)
  }

  return {
    protocol,
    port,
    host
  }
}

export const validateProfileConfig = async (ctx: Context, config: ParsedProfileConfig): Promise<ProfileConfig> => {
  const server = config.relay ?? ctx.config.global.activeServer ?? DEFAULT_SERVER_NAME
  const serverConf = validateServerConfig(ctx, ctx.config.global.server(server))
  const target = validateTarget(ctx, config)
  const profileName = config.name ?? DEFAULT_PROFILE_NAME
  const apiClient = ctx.apiClient.withServer(serverConf)

  if (!config.proxy) {
    const result = await apiClient.registerProxy(target, profileName)
    if (result.error) {
      ctx.logger.error(`Failed to create proxy: ${result.error.message}`)
      return ctx.exit(1)
    }
    config.proxy = result.data
  } else {
    const result = await apiClient.renewProxy(target, profileName, config.proxy.proxyIdent)
    if (result.error || !result.data) {
      ctx.logger.error(`Failed to renew proxy registration: ${result.error?.message ?? 'no data returned'}`)
      return ctx.exit(1)
    }
  }

  return {
    filepath: config.filepath ?? '-',
    allowedCidr: config.allowCidr ?? [],
    deniedCidr: config.denyCidr ?? [],
    profileName,
    serverConfig: serverConf,
    apiClient,
    proxy: config.proxy,
    target
  }
}
