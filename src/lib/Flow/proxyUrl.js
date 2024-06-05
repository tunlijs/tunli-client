import {securedHttpClient} from "#lib/HttpClient";
import {SERVER_HOST} from "#lib/defs";

export const requestNewProxyUrl = async (token) => {

  const {data, error} = await securedHttpClient(token).get('/create');

  if (error) {
    console.error('Auth failed as server response error, status: ', error);
    process.exit(1)
  }

  return `https://${data}.${SERVER_HOST}`
}

export const renewProxyUrlRegistration = async (proxyUrl, token) => {

  const subDomain = new URL(proxyUrl).hostname.split('.', 1)[0]

  const {data, error} = await securedHttpClient(token).get(`/renew/${subDomain}`);

  if (!data) {
    console.error('Renew failed, request a new URL', error);
    return null
  }

  return proxyUrl
}
