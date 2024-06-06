import axios from "axios";
import {AUTH_SERVER_URL} from "#lib/defs";

const createClient = (options = {}) => {

  const defaultOptions = {
    baseURL: AUTH_SERVER_URL,
    headers: {
      'user-agent': 'tunli/1.0'
    }
  }

  const headers = {...defaultOptions.headers, ...options.headers ?? {}};
  options = {...defaultOptions, ...options, headers};

  const httpClient = axios.create(options)
  httpClient.interceptors.response.use((response) => {
      return {
        data: response.data
      }
    },
    (error) => {
      if (error.code === 'ECONNREFUSED') {
        console.error('Connection refused to', error.config.url);
      }
      const message = error.response?.data ? error.response?.data : null
      return Promise.resolve({
        error: message ?? {
          code: error.code,
          message: error.message
        }
      });
    });

  return httpClient
}


/**
 * @type {AxiosInstance}
 */
export const httpClient = createClient();

/**
 * @type {AxiosInstance}
 */
export const npmApiClient = createClient({
  baseURL: 'https://registry.npmjs.org/'
});

/**
 * @param {string} token - Der Authentifizierungs-Token.
 * @returns {AxiosInstance} - Eine konfigurierte Axios-Instanz mit Authentifizierung.
 */
export const securedHttpClient = (token) => {
  return createClient({
    headers: {
      authorization: `Bearer ${token}`,
    },
  })
}
