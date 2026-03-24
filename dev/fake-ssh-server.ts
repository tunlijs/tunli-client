/**
 * Dev script: fake SSH server on port 8888.
 * Responds with a valid SSH banner and echoes data back.
 * Run with: npx tsx dev/fake-ssh-server.ts
 */
import net from 'node:net'

const PORT = 8888

const server = net.createServer((socket) => {
  const addr = `${socket.remoteAddress}:${socket.remotePort}`
  console.log(`[+] Connection from ${addr}`)

  // SSH protocol requires the server to send its banner first
  socket.write('SSH-2.0-FakeSSH_1.0 tunli-dev\r\n')

  socket.on('data', (chunk) => {
    console.log(`[>] ${chunk.length} bytes from ${addr}: ${chunk.toString('hex').slice(0, 40)}...`)
    // Echo back so the client gets a response
    socket.write(chunk)
  })

  socket.on('end', () => console.log(`[-] Disconnected: ${addr}`))
  socket.on('error', (e) => console.log(`[!] Error from ${addr}: ${e.message}`))
})

server.listen(PORT, '127.0.0.1', () => {
  console.log(`Fake SSH server listening on localhost:${PORT}`)
})
