import {httpClient} from "#lib/HttpClient";
import {checkIpV4Cidr} from "#src/utils/checkFunctions";

export const getCurrentIp = async () => {
  const {data, error} = await httpClient.get(`/ip`);

  if (error) {
    console.error(error)
    process.exit(1)
  }

  try {
    return checkIpV4Cidr(data)
  } catch {
    console.log(`invalid ip v4 address "${data}"`)
    process.exit(1)
  }
}
