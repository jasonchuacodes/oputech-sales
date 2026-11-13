import { redirect } from 'next/navigation'
import { UserRoutes } from '@/routes/paths'

export default function StockRoute() {
  redirect(UserRoutes.Products)
}
