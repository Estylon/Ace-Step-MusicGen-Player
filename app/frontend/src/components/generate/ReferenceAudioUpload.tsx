import { useState, useCallback } from 'react'
import { FileAudio, X } from 'lucide-react'
import DropZone from '../ui/DropZone'
import Button from '../ui/Button'
import { useGenerationStore } from '../../stores/useGenerationStore'
import { uploadReferenceAudio } from '../../api/generate'
import { formatDuration } from '../../lib/utils'

interface UploadedFile {
  filename: string
  path: string
  duration: number | null
}

export default function ReferenceAudioUpload() {
  const updateForm = useGenerationStore((s) => s.updateForm)
  const referenceAudio = useGenerationStore((s) => s.form.reference_audio)

  const [uploadedFile, setUploadedFile] = useState<UploadedFile | null>(null)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleDrop = useCallback(
    async (files: File[]) => {
      const file = files[0]
      if (!file) return

      setUploading(true)
      setError(null)

      try {
        const result = await uploadReferenceAudio(file)
        setUploadedFile({
          filename: result.filename,
          path: result.path,
          duration: result.duration,
        })
        updateForm({ reference_audio: result.path })
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Upload failed')
      } finally {
        setUploading(false)
      }
    },
    [updateForm],
  )

  const handleClear = useCallback(() => {
    setUploadedFile(null)
    setError(null)
    updateForm({ reference_audio: null })
  }, [updateForm])

  // If file is already uploaded, show info
  if (uploadedFile || referenceAudio) {
    return (
      <div className="flex items-center gap-3 p-3 rounded-[var(--radius)] bg-[var(--bg-secondary)] border border-[var(--border)]">
        <FileAudio className="w-5 h-5 text-[var(--accent-hover)] shrink-0" />
        <div className="flex flex-col min-w-0 flex-1">
          <span className="text-sm text-[var(--text-primary)] truncate">
            {uploadedFile?.filename ?? 'Reference audio'}
          </span>
          {uploadedFile?.duration != null && (
            <span className="text-xs text-[var(--text-muted)]">
              {formatDuration(uploadedFile.duration)}
            </span>
          )}
        </div>
        <Button variant="ghost" size="sm" onClick={handleClear}>
          <X className="w-4 h-4" />
        </Button>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-2">
      <DropZone
        onDrop={handleDrop}
        accept="audio/*"
        label={
          uploading
            ? 'Uploading...'
            : 'Drop reference audio here or click to browse'
        }
        className={uploading ? 'opacity-60 pointer-events-none' : ''}
      />
      {error && (
        <p className="text-xs text-[var(--error)]">{error}</p>
      )}
    </div>
  )
}
