# Tunli

Tunli is a Node.js application that creates HTTP tunnels to make local software projects accessible over the internet.
This is particularly useful for developing and testing applications that need to be reachable from anywhere.

## Installation

To install Tunli, run the following command:

```bash
npm install -g tunli
```

## Usage

Tunli can be used from the command line with various commands and options. Here are some of the key commands:

### Display Help

```bash
tunli --help
```

### Configure and View Settings

```bash
tunli config
tunli config host localhost
tunli config port 80
```

### Create HTTP Tunnel

```bash
tunli http [PORT] [HOST]
```

Example:

```bash
tunli http localhost:80
```

### Registration and Authentication

To use Tunli, you need to register and authenticate.

#### Register

```bash
tunli register
```

#### Authenticate

```bash
tunli auth <TOKEN>
```

### Create an Invitation

Generate a shareable registration token:

```bash
tunli invite
```

## Examples

Here are some examples of how to use Tunli:

- Set the host for the local configuration:

  ```bash
  tunli config host localhost
  ```

- Set the port for the local configuration:

  ```bash
  tunli config port 80
  ```

- Show the local configuration:

  ```bash
  tunli config
  ```

- Show the global configuration:

  ```bash
  tunli config --global
  ```

- Forward HTTP requests to `localhost:80`:

  ```bash
  tunli http localhost:80
  ```

- Create a shareable registration token:

  ```bash
  tunli invite
  ```

- Register this client with a given token:

  ```bash
  tunli auth <TOKEN>
  ```

## Dependencies

Tunli relies on the following packages:

- `axios`: ^1.7.2
- `blessed`: ^0.1.81
- `chalk`: ^5.3.0
- `commander`: ^12.1.0
- `https-proxy-agent`: ^7.0.4
- `socket.io-client`: ^4.7.5

## Development

For development purposes, you can start the application using nodemon to automatically restart it on file changes:

_$ TUNLI_API_SERVER_URL=http://127.0.0.1:10000/api TUNLI_DASHBOARD=off TUNLI_SERVER=http://127.0.0.1:10000  TUNLI_PROXY_URL='http://127.0.0.1:10000/proxy/{{ uuid }}' node client.js register -f

```bash
npm run dev
```

## License

Tunli is licensed under the GPL-3.0 License.
