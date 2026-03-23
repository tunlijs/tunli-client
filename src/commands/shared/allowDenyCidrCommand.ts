import {Command, Option} from "#commander/index";
import {checkIpV4Cidr} from "#utils/checkFunctions";

export const addAllowDenyCidrOptions = (cmd: Command) => {
//  cmd.option('--allow-self, --self', 'allow self only')//, false)
  cmd
    .addOption(
      new Option('allow-cidr', 'Allow traffic from these CIDRs')
        .alias('allow').argument('cidr').many().parse(checkIpV4Cidr)
    ).addOption(
    new Option('deny-cidr', 'Deny traffic from these CIDRs')
      .alias('deny').argument('cidr').many().parse(checkIpV4Cidr)
  )
}
