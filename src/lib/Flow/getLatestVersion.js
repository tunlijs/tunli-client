import {npmApiClient} from "#lib/HttpClient";

export const getLatestVersion = async () => {

  await new Promise(resolve => setTimeout(resolve, 2000))
  const {data, error} = await npmApiClient.get('/-/package/tunli/dist-tags')

  if (error) {
    return false
  }

  return data.latest
}
