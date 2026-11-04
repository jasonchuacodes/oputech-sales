import { spawn } from 'node:child_process'

const children = new Set()
let shuttingDown = false

const start = (args) => {
  const child = spawn('pnpm', args, {
    cwd: process.cwd(),
    env: process.env,
    stdio: 'inherit',
  })
  children.add(child)
  child.once('exit', () => children.delete(child))
  return child
}

const stop = (signal = 'SIGTERM') => {
  if (shuttingDown) return
  shuttingDown = true
  for (const child of children) child.kill(signal)
}

process.once('SIGINT', () => stop('SIGINT'))
process.once('SIGTERM', () => stop('SIGTERM'))
process.once('exit', () => stop())

const server = start(['--filter', '@oputech/sales-server', 'dev'])
let serverExit
server.once('exit', (code, signal) => {
  serverExit = { code, signal }
})

const deadline = Date.now() + 60_000
while (Date.now() < deadline) {
  if (serverExit) {
    throw new Error(
      `The API server exited before becoming ready (${serverExit.signal ?? serverExit.code ?? 'unknown'}).`,
    )
  }

  try {
    const response = await fetch('http://localhost:3000/api/health')
    if (response.ok) break
  } catch {
    // The Nest watcher is still compiling or connecting to MongoDB.
  }

  await new Promise((resolve) => setTimeout(resolve, 250))
}

if (Date.now() >= deadline) {
  stop()
  throw new Error('The API server did not become ready within 60 seconds.')
}

console.log('API server is ready; starting the client...')
const client = start(['--filter', '@oputech/sales-client', 'dev'])

server.once('exit', (code) => {
  if (!shuttingDown) {
    console.error(`API server stopped with exit code ${code ?? 1}.`)
    stop()
    process.exitCode = code ?? 1
  }
})

client.once('exit', (code) => {
  if (!shuttingDown) {
    stop()
    process.exitCode = code ?? 0
  }
})
