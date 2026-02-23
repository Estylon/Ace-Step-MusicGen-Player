import clsx from 'clsx'

interface ProgressRingProps {
  progress: number
  size?: number
  strokeWidth?: number
  className?: string
}

export default function ProgressRing({
  progress,
  size = 40,
  strokeWidth = 3,
  className,
}: ProgressRingProps) {
  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  const clamped = Math.min(100, Math.max(0, progress))
  const offset = circumference - (clamped / 100) * circumference

  return (
    <svg
      width={size}
      height={size}
      className={clsx('transform -rotate-90', className)}
      viewBox={`0 0 ${size} ${size}`}
    >
      {/* Background track */}
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke="var(--bg-elevated)"
        strokeWidth={strokeWidth}
      />
      {/* Progress arc */}
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke="var(--accent)"
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        className="transition-[stroke-dashoffset] duration-300 ease-out"
      />
    </svg>
  )
}
