import { useRef, type DragEvent } from 'react'
import { ImagePlus, X } from 'lucide-react'
import { cn } from '../../utils/cn'

interface ImageDropzoneProps {
  value?: string
  onChange: (value: string) => void
  onError?: (message: string) => void
  disabled?: boolean
  maxSizeBytes?: number
  className?: string
}

export const ImageDropzone = ({
  value,
  onChange,
  onError,
  disabled,
  maxSizeBytes = 5 * 1024 * 1024,
  className,
}: ImageDropzoneProps) => {
  const inputRef = useRef<HTMLInputElement>(null)

  const handleFile = (file: File | undefined) => {
    if (!file) return

    if (!file.type.startsWith('image/')) {
      onError?.('Please upload an image file')
      return
    }

    if (file.size > maxSizeBytes) {
      onError?.(
        `Image must be smaller than ${Math.round(maxSizeBytes / (1024 * 1024))}MB`
      )
      return
    }

    const reader = new FileReader()
    reader.onload = () => onChange(reader.result as string)
    reader.onerror = () => onError?.('Could not read file')
    reader.readAsDataURL(file)
  }

  const handleDrop = (e: DragEvent<HTMLLabelElement>) => {
    e.preventDefault()
    if (disabled) return
    handleFile(e.dataTransfer.files[0])
  }

  const handleRemove = () => {
    onChange('')
  }

  if (value) {
    return (
      <div className={cn('relative inline-flex', className)}>
        {/* User-selected data URLs are intentionally rendered without Next image optimization. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={value}
          alt="Product preview"
          className="border-border h-24 w-24 rounded-md border object-cover"
        />
        {!disabled && (
          <button
            type="button"
            onClick={handleRemove}
            aria-label="Remove image"
            className="bg-foreground text-background absolute -top-2 -right-2 flex h-6 w-6 cursor-pointer items-center justify-center rounded-md"
          >
            <X size={14} />
          </button>
        )}
      </div>
    )
  }

  return (
    <label
      onDragOver={(e) => e.preventDefault()}
      onDrop={handleDrop}
      className={cn(
        'border-border text-muted-foreground flex flex-col items-center justify-center gap-2 rounded-md border-2 border-dashed p-6 select-none',
        disabled
          ? 'cursor-not-allowed opacity-50'
          : 'hover:border-brand hover:text-foreground cursor-pointer',
        className
      )}
    >
      <ImagePlus size={24} />
      <p className="text-sm">Drag & drop or click to upload</p>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        disabled={disabled}
        className="hidden"
        onChange={(e) => handleFile(e.target.files?.[0])}
      />
    </label>
  )
}
