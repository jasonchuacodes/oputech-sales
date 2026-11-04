import { useMediaQuery } from './useMediaQuery'

export const DESKTOP_MEDIA_QUERY = '(min-width: 768px)'

export const useIsDesktop = () => useMediaQuery(DESKTOP_MEDIA_QUERY)
