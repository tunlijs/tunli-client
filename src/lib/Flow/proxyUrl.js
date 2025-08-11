import {securedHttpClient} from "#lib/HttpClient";
import {TUNLI_PROXY_URL} from "#lib/defs";
import {replaceTemplatePlaceholders} from "#src/utils/stringFunctions";

export const requestNewProxyUrl = async (token) => {

  const {data, error} = await securedHttpClient(token).get('/create');

  if (error) {
    console.error('Auth failed as server response error, status: ', error);
    process.exit(1)
  }

  return replaceTemplatePlaceholders(TUNLI_PROXY_URL, {
    uuid: data
  })
}

export const renewProxyUrlRegistration = async (proxyUrl, token) => {

  const subDomain = new URL(proxyUrl).hostname.split('.', 1)[0]

  const {data, error} = await securedHttpClient(token).get(`/renew/${subDomain}`);

  if (data === false) {
    return false
  }

  if (!data) {
    console.error('Renew failed, request a new URL', error);
    process.exit(1)
  }

  return proxyUrl
}
