import { UserRole } from '../types'

export const PublicRoutes = {
  Login: '/login',
}

export const UserRoutes = {
  Onboarding: '/onboarding',
  Home: '/dashboard',
  Users: '/users',
  Products: '/products',
  POS: '/sell',
  Transactions: '/activity',
  Reports: '/reports',
  ReportDetail: '/reports/:reportId',
  Account: '/account',
}

export const userHomePath = (role: UserRole) =>
  role === UserRole.STAFF ? UserRoutes.POS : UserRoutes.Home

export const reportDetailPath = (reportId: string) => `/reports/${reportId}`
