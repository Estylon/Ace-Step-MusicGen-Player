import { Scissors } from 'lucide-react'
import StemUploader from './StemUploader'
import StemModelSelector from './StemModelSelector'
import StemResults from './StemResults'

export default function StemSeparatorPage() {
  return (
    <div className="flex flex-col gap-6 p-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="flex items-center justify-center w-10 h-10 rounded-[var(--radius-lg)] bg-[var(--accent-muted)]">
          <Scissors className="h-5 w-5 text-[var(--accent)]" />
        </div>
        <div>
          <h1 className="text-xl font-semibold text-[var(--text-primary)]">
            Stem Separator
          </h1>
          <p className="text-sm text-[var(--text-muted)]">
            Isolate vocals, drums, bass and more from any audio track
          </p>
        </div>
      </div>

      {/* Uploader */}
      <StemUploader />

      {/* Model selector + action */}
      <StemModelSelector />

      {/* Results */}
      <StemResults />
    </div>
  )
}
