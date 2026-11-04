import { redirect } from 'next/navigation'
import { UserRoutes } from '@/routes/paths'

export default function MoreRoute() {
  redirect(UserRoutes.Account)
}
