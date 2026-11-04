import 'dotenv/config'

const args = process.argv.slice(2)

const getArg = (name: string): string | undefined => {
  const index = args.indexOf(`--${name}`)
  return index === -1 ? undefined : args[index + 1]
}

const username = getArg('username')
const password = getArg('password')

if (!username || !password) {
  console.error(
    'Usage: pnpm register-superadmin -- --username <username> --password <password>',
  )
  process.exit(1)
}

const apiUrl = process.env.API_URL ?? 'http://localhost:3000/api'
const secret =
  process.env.SUPERADMIN_SCRIPT_SECRET ?? process.env.ADMIN_SCRIPT_SECRET

if (!secret) {
  console.error('SUPERADMIN_SCRIPT_SECRET must be set in app/server/.env')
  process.exit(1)
}

const main = async () => {
  let res: Response
  try {
    res = await fetch(`${apiUrl}/auth/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-superadmin-script-secret': secret,
      },
      body: JSON.stringify({ username, password }),
    })
  } catch {
    console.error(
      `Could not reach ${apiUrl}. Start the application with "pnpm dev" before running this command.`,
    )
    process.exit(1)
  }

  const body = await res.json()

  if (!res.ok) {
    console.error('Failed to register super admin:', body)
    process.exit(1)
  }

  console.log('Super admin registered:', body)
}

main()
