import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios'

const axiosInstance = axios.create({
  baseURL: '/api',
  headers: { 'Content-Type': 'application/json' },
  withCredentials: true,
  timeout: 15_000,
})

const NO_RETRY_PATHS = ['/auth/login', '/auth/refresh']

type RetryableRequestConfig = InternalAxiosRequestConfig & { _retry?: boolean }

let refreshPromise: Promise<void> | null = null

const refreshAccessToken = () => {
  if (!refreshPromise) {
    refreshPromise = axiosInstance
      .post('/auth/refresh')
      .then(() => undefined)
      .finally(() => {
        refreshPromise = null
      })
  }
  return refreshPromise
}

axiosInstance.interceptors.response.use(
  (res) => res,
  async (error: AxiosError) => {
    const config = error.config as RetryableRequestConfig | undefined

    const shouldSkipRetry =
      !config ||
      config._retry ||
      error.response?.status !== 401 ||
      NO_RETRY_PATHS.some((path) => config.url?.includes(path))

    if (shouldSkipRetry) return Promise.reject(error)

    config._retry = true

    try {
      await refreshAccessToken()
      return axiosInstance(config)
    } catch (refreshError) {
      return Promise.reject(refreshError)
    }
  }
)

export default axiosInstance
