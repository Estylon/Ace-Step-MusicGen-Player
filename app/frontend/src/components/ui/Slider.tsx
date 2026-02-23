import * as RadixSlider from '@radix-ui/react-slider'
import clsx from 'clsx'

interface SliderProps {
  label?: string
  min: number
  max: number
  step: number
  value: number[]
  onValueChange: (value: number[]) => void
  formatValue?: (value: number) => string
  className?: string
}

export default function Slider({
  label,
  min,
  max,
  step,
  value,
  onValueChange,
  formatValue,
  className,
}: SliderProps) {
  const displayValue = formatValue
    ? formatValue(value[0])
    : String(value[0])

  return (
    <div className={clsx('flex flex-col gap-2', className)}>
      {label && (
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-[var(--text-secondary)]">
            {label}
          </span>
          <span className="text-sm tabular-nums text-[var(--text-primary)]">
            {displayValue}
          </span>
        </div>
      )}
      <RadixSlider.Root
        className="relative flex items-center select-none touch-none h-5 w-full"
        min={min}
        max={max}
        step={step}
        value={value}
        onValueChange={onValueChange}
      >
        <RadixSlider.Track className="relative grow rounded-full h-1.5 bg-[var(--bg-elevated)]">
          <RadixSlider.Range className="absolute h-full rounded-full bg-[var(--accent)]" />
        </RadixSlider.Track>
        <RadixSlider.Thumb
          className={clsx(
            'block w-4 h-4 rounded-full',
            'bg-white shadow-[var(--shadow-sm)]',
            'transition-transform duration-[var(--transition)]',
            'hover:scale-110',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]',
          )}
        />
      </RadixSlider.Root>
    </div>
  )
}
