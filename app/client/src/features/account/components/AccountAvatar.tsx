import { UserRound } from 'lucide-react'
import { cn } from '@/utils/cn'

type AccountAvatarProps = {
  username?: string | null
  className?: string
  iconClassName?: string
}

export const getAccountInitials = (username?: string | null) => {
  const parts =
    username
      ?.trim()
      .split(/[\s._-]+/)
      .filter(Boolean) ?? []

  if (parts.length > 1) {
    return `${parts[0][0]}${parts.at(-1)?.[0] ?? ''}`.toUpperCase()
  }

  return parts[0]?.slice(0, 2).toUpperCase() ?? ''
}

export const AccountAvatar = ({
  username,
  className,
  iconClassName,
}: AccountAvatarProps) => {
  const initials = getAccountInitials(username)

  return (
    <span
      aria-hidden="true"
      className={cn(
        'bg-primary text-primary-foreground inline-flex size-10 shrink-0 items-center justify-center rounded-full text-sm font-semibold',
        className
      )}
    >
      {initials || <UserRound className={cn('size-5', iconClassName)} />}
    </span>
  )
}
