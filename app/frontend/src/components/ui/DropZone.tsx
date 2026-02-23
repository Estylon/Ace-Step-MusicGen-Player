import { useCallback, useState, useRef, type DragEvent } from 'react'
import { Upload } from 'lucide-react'
import clsx from 'clsx'

interface DropZoneProps {
  onDrop: (files: File[]) => void
  accept?: string
  label?: string
  className?: string
}

export default function DropZone({
  onDrop,
  accept = 'audio/*',
  label = 'Drop audio files here or click to browse',
  className,
}: DropZoneProps) {
  const [isDragging, setIsDragging] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const handleDragOver = useCallback((e: DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(true)
  }, [])

  const handleDragLeave = useCallback((e: DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
  }, [])

  const handleDrop = useCallback(
    (e: DragEvent<HTMLDivElement>) => {
      e.preventDefault()
      e.stopPropagation()
      setIsDragging(false)

      const files = Array.from(e.dataTransfer.files)
      if (files.length > 0) {
        onDrop(files)
      }
    },
    [onDrop],
  )

  const handleClick = useCallback(() => {
    inputRef.current?.click()
  }, [])

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files ? Array.from(e.target.files) : []
      if (files.length > 0) {
        onDrop(files)
      }
      // Reset so re-selecting the same file triggers onChange
      if (inputRef.current) {
        inputRef.current.value = ''
      }
    },
    [onDrop],
  )

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={handleClick}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') handleClick()
      }}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={clsx(
        'flex flex-col items-center justify-center gap-3 p-8',
        'rounded-[var(--radius-lg)]',
        'border-2 border-dashed',
        'transition-all duration-[var(--transition)]',
        'cursor-pointer select-none',
        isDragging
          ? 'border-[var(--accent)] bg-[var(--accent-muted)]'
          : 'border-[var(--border)] bg-[var(--bg-secondary)] hover:border-[var(--border-hover)] hover:bg-[var(--bg-tertiary)]',
        className,
      )}
    >
      <Upload
        className={clsx(
          'h-8 w-8',
          isDragging ? 'text-[var(--accent)]' : 'text-[var(--text-muted)]',
        )}
      />
      <p
        className={clsx(
          'text-sm text-center',
          isDragging ? 'text-[var(--accent)]' : 'text-[var(--text-muted)]',
        )}
      >
        {label}
      </p>
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        multiple
        className="hidden"
        onChange={handleFileChange}
      />
    </div>
  )
}
