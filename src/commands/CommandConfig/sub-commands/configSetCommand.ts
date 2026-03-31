import type {Context} from "#types/types";
import {Argument, Command, InvalidArgumentError, Option, type ParseResult, type UnknownRecord} from "#commander/index";
import {formatSaveResult} from "#output-formats/formatSaveResult";
import {resolveConfig} from "#commands/CommandConfig/utils/resolveConfig";
import {checkIpV4Cidr, checkPort} from "#utils/checkFunctions";
import {ipV4, type IPv4Address} from "@pfeiferio/ipv4";
import type {SharedOptions} from "#commands/CommandConfig/types";

type CidrOptions = SharedOptions & { add?: IPv4Address[]; del?: IPv4Address[] }

const createSetSubCommand = <T>(
  ctx: Context,
  name: string,
  description: string,
  validation?: (val: string) => T
): Command => {
  return new Command(name)
    .addArgument(validation
      ? new Argument(name, description).required().parse(validation)
      : new Argument(name, description).required()
    )
    .action(({args, options}: ParseResult<UnknownRecord, SharedOptions>) => {
      const config = resolveConfig(ctx, options)
      config.update({
        [name]: args[name] as T
      }).save()
      ctx.stdOut(formatSaveResult(config))
    })
}

const createSetCidrSubCommand = (
  ctx: Context,
  name: "allowCidr" | "denyCidr",
  description: string,
): Command => {
  const cmd = new Command(name)
    .addArgument(new Argument('cidr', description).many().parse(checkIpV4Cidr))
    .addOption(
      new Option('add', 'Add entries')
        .argument('cidr')
        .many()
        .short('a')
        .parse(checkIpV4Cidr))
    .addOption(
      new Option('del', 'Remove entries')
        .argument('cidr')
        .many()
        .short('d')
        .parse(checkIpV4Cidr))
    .action(({args, options}: ParseResult<{ cidr?: IPv4Address[] }, CidrOptions>) => {
      const values = (args.cidr ?? []) as IPv4Address[]

      if (values.length && (options.add?.length || options.del?.length)) {
        throw new InvalidArgumentError('Cannot combine positional arguments with --add/--del')
      }

      const config = resolveConfig(ctx, options)

      if (values.length) {
        config.update({
          [name]: [...new Set(values.filter(ip1 =>
            !values.some(
              ip2 =>
                ip1.network().addressWithCidr !== ip2.network().addressWithCidr
                && ip2.network().containsNetwork(ip1.network())
            )
          ).map(ip =>
            ip.network().addressWithCidr
          ))]
        }).save()
        ctx.stdOut(formatSaveResult(config))
        return
      }

      const all = (config[name] ?? []).map(ipV4)
      ;(options.add ?? []).forEach(ip => all.push(ip))
      const del = options.del ?? []
      const filtered = all.filter(
        ip1 => {
          return !(all.some(
              ip2 =>
                ip1.network().addressWithCidr !== ip2.network().addressWithCidr
                && ip2.network().containsNetwork(ip1.network())
            )
            || del.some(
              delIp => delIp.network().containsNetwork(ip1.network())
            )
          )
        }
      ).map(ip => ip.network().addressWithCidr)

      config.update({[name]: [...new Set(filtered)]}).save()
      ctx.stdOut(formatSaveResult(config))
    })

  return cmd
}

export const configSetCommand = (ctx: Context) => {
  return new Command('set')
    .description('Set a configuration value')
    .requires(() => ({ command: true }))
    .addCommand(createSetSubCommand(ctx, 'relay', 'Relay server URL to connect to'))
    .addCommand(createSetSubCommand(ctx, 'host', 'Local host to forward to'))
    .addCommand(createSetSubCommand(ctx, 'port', 'Local port to forward', checkPort))
    .addCommand(createSetCidrSubCommand(ctx, 'allowCidr', 'IP ranges allowed to access the tunnel'))
    .addCommand(createSetCidrSubCommand(ctx, 'denyCidr', 'IP ranges blocked from the tunnel'))
}
