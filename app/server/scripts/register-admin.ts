import 'dotenv/config'

const args = process.argv.slice(2)

const getArg = (name: string): string | undefined => {
  const index = args.indexOf(`--${name}`)
  return index === -1 ? undefined : args[index + 1]
}

const username = getArg('username')
const password = getArg('password')

if (!username || !password) {
  console.error('Usage: register-admin -- --username <username> --password <password>')
  process.exit(1)
}

const apiUrl = process.env.API_URL ?? 'http://localhost:3000/api'
const secret = process.env.ADMIN_SCRIPT_SECRET

if (!secret) {
  console.error('ADMIN_SCRIPT_SECRET env var is required')
  process.exit(1)
}

const main = async () => {
  const res = await fetch(`${apiUrl}/auth/register`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-admin-script-secret': secret,
    },
    body: JSON.stringify({ username, password }),
  })

  const body = await res.json()

  if (!res.ok) {
    console.error('Failed to register admin:', body)
    process.exit(1)
  }

  console.log('Admin registered:', body)
}

main()
