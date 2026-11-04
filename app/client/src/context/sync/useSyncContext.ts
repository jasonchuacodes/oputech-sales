import { useContext } from 'react'
import { SyncContext } from './sync-context'

export const useSyncContext = () => useContext(SyncContext)
