import Image, { type ImageProps } from 'next/image'
import { cn } from '@/utils/cn'

type BrandLogoProps = Omit<ImageProps, 'alt' | 'height' | 'src' | 'width'> & {
  variant?: 'mark' | 'wordmark'
  alt?: string
}

const brandAssets = {
  mark: {
    src: '/assets/brand/mark.png',
    width: 512,
    height: 512,
  },
  wordmark: {
    src: '/assets/brand/wordmark.png',
    width: 1000,
    height: 248,
  },
} as const

export function BrandLogo({
  variant = 'mark',
  alt = 'Oputech Sales',
  className,
  ...props
}: BrandLogoProps) {
  const asset = brandAssets[variant]

  return (
    <Image
      src={asset.src}
      width={asset.width}
      height={asset.height}
      alt={alt}
      className={cn('h-auto object-contain', className)}
      unoptimized
      {...props}
    />
  )
}
