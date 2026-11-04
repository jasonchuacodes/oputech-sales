export const PublicRoutes = {
  Login: '/login',
}

export const UserRoutes = {
  Home: '/dashboard',
  Users: '/users',
  Inventory: '/catalog',
  POS: '/sell',
  Transactions: '/activity',
  Reports: '/reports',
  ReportDetail: '/reports/:reportId',
  More: '/more',
}

export const reportDetailPath = (reportId: string) => `/reports/${reportId}`
