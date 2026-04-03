import { spawn } from 'node:child_process'
import { setTimeout as delay } from 'node:timers/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const repoRoot = path.resolve(__dirname, '..')
const resolverDir = path.join(repoRoot, 'resolver')
const desktopDir = path.join(repoRoot, 'desktop')
const resolverHealthUrl = 'http://127.0.0.1:61337/api/health'

const children = []

function printHelp() {
  console.log(`VidGrab hosted dev runner

Usage:
  node scripts/dev-host.mjs

What it does:
  1. starts the local Python resolver
  2. waits until resolver health check passes
  3. starts the desktop Vite dev server
  4. forwards Ctrl+C / process exit to both child processes
`)
}

if (process.argv.includes('--help') || process.argv.includes('-h')) {
  printHelp()
  process.exit(0)
}

function spawnProcess(command, args, options = {}) {
  const child = spawn(command, args, {
    cwd: options.cwd,
    shell: false,
    stdio: 'inherit',
    env: {
      ...process.env,
      ...(options.env || {}),
    },
  })

  children.push(child)
  child.on('exit', (code, signal) => {
    if (signal) {
      console.log(`[host] child stopped by signal: ${command} ${args.join(' ')} -> ${signal}`)
      return
    }
    if (code && code !== 0) {
      console.log(`[host] child exited with code ${code}: ${command} ${args.join(' ')}`)
    }
  })
  return child
}

async function isResolverHealthy() {
  try {
    const response = await fetch(resolverHealthUrl)
    if (!response.ok) {
      return false
    }
    const payload = await response.json()
    return payload.status === 'ok'
  } catch {
    return false
  }
}

async function waitForResolver(maxAttempts = 40) {
  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    if (await isResolverHealthy()) {
      return true
    }
    await delay(500)
  }
  return false
}

function stopChildren(exitCode = 0) {
  for (const child of children) {
    if (!child.killed) {
      child.kill('SIGTERM')
    }
  }
  setTimeout(() => {
    for (const child of children) {
      if (!child.killed) {
        child.kill('SIGKILL')
      }
    }
    process.exit(exitCode)
  }, 500)
}

process.on('SIGINT', () => stopChildren(0))
process.on('SIGTERM', () => stopChildren(0))
process.on('exit', () => {
  for (const child of children) {
    if (!child.killed) {
      child.kill('SIGTERM')
    }
  }
})

async function main() {
  console.log('[host] starting resolver...')
  const resolverCommand = process.platform === 'win32' ? 'py' : 'python3'
  const resolverArgs = process.platform === 'win32' ? ['-3', 'server.py'] : ['server.py']
  const resolver = spawnProcess(resolverCommand, resolverArgs, { cwd: resolverDir })

  resolver.on('error', (error) => {
    console.error('[host] failed to start resolver:', error.message)
    stopChildren(1)
  })

  const healthy = await waitForResolver()
  if (!healthy) {
    console.error('[host] resolver health check did not become ready in time')
    stopChildren(1)
    return
  }

  console.log('[host] resolver is healthy, starting desktop dev server...')
  const npmCommand = process.platform === 'win32' ? 'npm.cmd' : 'npm'
  const desktop = spawnProcess(npmCommand, ['run', 'dev', '--', '--host', '127.0.0.1'], { cwd: desktopDir })

  desktop.on('error', (error) => {
    console.error('[host] failed to start desktop dev server:', error.message)
    stopChildren(1)
  })
}

main().catch((error) => {
  console.error('[host] unexpected failure:', error)
  stopChildren(1)
})
