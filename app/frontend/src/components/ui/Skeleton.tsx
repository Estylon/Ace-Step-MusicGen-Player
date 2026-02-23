import clsx from 'clsx'

interface SkeletonProps {
  className?: string
  width?: string | number
  height?: string | number
}

export default function Skeleton({ className, width, height }: SkeletonProps) {
  return (
    <div
      className={clsx(
        'rounded-[var(--radius)] bg-[var(--bg-elevated)]',
        'animate-pulse',
        className,
      )}
      style={{
        width: typeof width === 'number' ? `${width}px` : width,
        height: typeof height === 'number' ? `${height}px` : height,
      }}
    />
  )
}
