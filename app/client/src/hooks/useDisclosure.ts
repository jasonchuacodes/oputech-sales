import { useCallback, useState } from 'react'

export const useDisclosure = (defaultOpen = false) => {
  const [open, setOpen] = useState(defaultOpen)

  const onOpen = useCallback(() => {
    setOpen(true)
  }, [])

  const onClose = useCallback(() => {
    setOpen(false)
  }, [])

  const onToggle = useCallback(() => {
    setOpen((prev) => !prev)
  }, [])

  return {
    open,
    setOpen,
    onOpen,
    onClose,
    onToggle,
  }
}
