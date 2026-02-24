import { useState, useCallback, useRef, type DragEvent } from 'react'
import { X, FileJson, ClipboardPaste, Upload, Check, AlertCircle, RotateCcw } from 'lucide-react'
import clsx from 'clsx'
import Button from '../ui/Button'
import Badge from '../ui/Badge'
import { useGenerationStore } from '../../stores/useGenerationStore'
import { parsePreset, type ImportResult } from '../../lib/presetIO'

interface ImportPresetModalProps {
  open: boolean
  onClose: () => void
}

export default function ImportPresetModal({ open, onClose }: ImportPresetModalProps) {
  const importPreset = useGenerationStore((s) => s.importPreset)

  const [jsonText, setJsonText] = useState('')
  const [preview, setPreview] = useState<ImportResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [imported, setImported] = useState(false)
  const [isDragging, setIsDragging] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // ── Parse / preview ─────────────────────────────────────────────────────
  const tryParse = useCallback((text: string) => {
    setJsonText(text)
    setError(null)
    setPreview(null)
    setImported(false)

    if (!text.trim()) return

    try {
      const result = parsePreset(text)
      setPreview(result)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Parse error')
    }
  }, [])

  // ── File upload ─────────────────────────────────────────────────────────
  const handleFile = useCallback(
    (file: File) => {
      if (!file.name.endsWith('.json') && file.type !== 'application/json') {
        setError('Please select a .json file')
        return
      }
      const reader = new FileReader()
      reader.onload = (e) => {
        const text = e.target?.result
        if (typeof text === 'string') {
          tryParse(text)
        }
      }
      reader.onerror = () => setError('Failed to read file')
      reader.readAsText(file)
    },
    [tryParse],
  )

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
      if (files.length > 0) handleFile(files[0])
    },
    [handleFile],
  )

  // ── Paste from clipboard ────────────────────────────────────────────────
  const handlePasteFromClipboard = useCallback(async () => {
    try {
      const text = await navigator.clipboard.readText()
      tryParse(text)
    } catch {
      setError('Failed to read clipboard. Try pasting manually with Ctrl+V.')
    }
  }, [tryParse])

  // ── Apply ───────────────────────────────────────────────────────────────
  const handleImport = useCallback(() => {
    if (!jsonText.trim()) return
    try {
      const result = importPreset(jsonText)
      setPreview(result)
      setImported(true)
      setError(null)
      // Auto-close after brief delay
      setTimeout(() => onClose(), 600)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Import failed')
    }
  }, [jsonText, importPreset, onClose])

  // ── Clear ───────────────────────────────────────────────────────────────
  const handleClear = useCallback(() => {
    setJsonText('')
    setPreview(null)
    setError(null)
    setImported(false)
  }, [])

  // ── Close handler ───────────────────────────────────────────────────────
  const handleClose = useCallback(() => {
    handleClear()
    onClose()
  }, [handleClear, onClose])

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={(e) => {
        if (e.target === e.currentTarget) handleClose()
      }}
    >
      <div
        className={clsx(
          'relative flex flex-col w-full max-w-2xl max-h-[85vh]',
          'mx-4 rounded-[var(--radius-lg)]',
          'bg-[var(--bg-primary)] border border-[var(--border)]',
          'shadow-2xl shadow-black/40',
        )}
      >
        {/* ── Header ─────────────────────────────────────────────────── */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--border)]">
          <div className="flex items-center gap-2.5">
            <FileJson className="w-5 h-5 text-[var(--accent)]" />
            <h2 className="text-lg font-semibold text-[var(--text-primary)]">
              Import Preset
            </h2>
          </div>
          <button
            onClick={handleClose}
            className="p-1.5 rounded-[var(--radius-sm)] text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)] transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* ── Body ───────────────────────────────────────────────────── */}
        <div className="flex flex-col gap-4 px-5 py-4 overflow-y-auto">
          {/* Action bar */}
          <div className="flex items-center gap-2">
            <Button variant="secondary" size="sm" onClick={handlePasteFromClipboard}>
              <ClipboardPaste className="w-3.5 h-3.5" />
              Paste from clipboard
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload className="w-3.5 h-3.5" />
              Load .json file
            </Button>
            {jsonText && (
              <Button variant="ghost" size="sm" onClick={handleClear}>
                <RotateCcw className="w-3.5 h-3.5" />
                Clear
              </Button>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept=".json,application/json"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0]
                if (file) handleFile(file)
                if (fileInputRef.current) fileInputRef.current.value = ''
              }}
            />
          </div>

          {/* Textarea (drop zone) */}
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className="relative"
          >
            <textarea
              value={jsonText}
              onChange={(e) => tryParse(e.target.value)}
              placeholder='Paste your JSON preset here, or drag & drop a .json file...'
              spellCheck={false}
              className={clsx(
                'w-full rounded-[var(--radius)] px-3 py-2.5 text-sm font-mono',
                'bg-[var(--bg-secondary)] text-[var(--text-primary)]',
                'border transition-colors duration-[var(--transition)]',
                'placeholder:text-[var(--text-muted)]',
                'focus:outline-none focus:ring-1',
                'resize-y min-h-[200px] max-h-[400px]',
                isDragging
                  ? 'border-[var(--accent)] ring-1 ring-[var(--accent)] bg-[var(--accent-muted)]'
                  : error
                    ? 'border-[var(--error)] focus:border-[var(--error)] focus:ring-[var(--error)]'
                    : preview
                      ? 'border-[var(--success)] focus:border-[var(--success)] focus:ring-[var(--success)]'
                      : 'border-[var(--border)] hover:border-[var(--border-hover)] focus:border-[var(--accent)] focus:ring-[var(--accent)]',
              )}
            />
            {isDragging && (
              <div className="absolute inset-0 flex items-center justify-center rounded-[var(--radius)] bg-[var(--accent-muted)]/80 pointer-events-none">
                <div className="flex items-center gap-2 text-[var(--accent)] font-medium">
                  <Upload className="w-5 h-5" />
                  Drop .json file here
                </div>
              </div>
            )}
          </div>

          {/* Error */}
          {error && (
            <div className="flex items-start gap-2 px-3 py-2.5 rounded-[var(--radius)] bg-[var(--error)]/10 border border-[var(--error)]/20">
              <AlertCircle className="w-4 h-4 text-[var(--error)] shrink-0 mt-0.5" />
              <p className="text-sm text-[var(--error)]">{error}</p>
            </div>
          )}

          {/* Preview */}
          {preview && !imported && (
            <div className="flex flex-col gap-2.5 px-3 py-3 rounded-[var(--radius)] bg-[var(--bg-secondary)] border border-[var(--border)]">
              <div className="flex items-center gap-2">
                <Check className="w-4 h-4 text-[var(--success)]" />
                <span className="text-sm font-medium text-[var(--text-primary)]">
                  Valid preset
                </span>
                <Badge variant="accent">{preview.fieldCount} fields</Badge>
                {preview.meta.ignored.length > 0 && (
                  <Badge variant="default">
                    {preview.meta.ignored.length} ignored
                  </Badge>
                )}
              </div>

              {/* Meta info */}
              {(preview.meta.title || preview.meta.dit_model || preview.meta.lm_model) && (
                <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-[var(--text-muted)]">
                  {preview.meta.title && (
                    <span>
                      Title: <strong className="text-[var(--text-secondary)]">{preview.meta.title}</strong>
                    </span>
                  )}
                  {preview.meta.dit_model && (
                    <span>
                      DiT: <strong className="text-[var(--text-secondary)]">{preview.meta.dit_model}</strong>
                    </span>
                  )}
                  {preview.meta.lm_model && (
                    <span>
                      LM: <strong className="text-[var(--text-secondary)]">{preview.meta.lm_model}</strong>
                    </span>
                  )}
                </div>
              )}

              {/* Key fields preview */}
              <div className="flex flex-wrap gap-1.5">
                {Object.entries(preview.formUpdate).slice(0, 12).map(([key, val]) => {
                  const display =
                    typeof val === 'string'
                      ? val.length > 30
                        ? `${val.slice(0, 30)}...`
                        : val
                      : String(val)
                  return (
                    <span
                      key={key}
                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-[var(--bg-elevated)] text-[var(--text-secondary)] border border-[var(--border)]"
                    >
                      <span className="text-[var(--text-muted)]">{key}:</span>
                      <span className="font-medium truncate max-w-[120px]">{display}</span>
                    </span>
                  )
                })}
                {Object.keys(preview.formUpdate).length > 12 && (
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs text-[var(--text-muted)]">
                    +{Object.keys(preview.formUpdate).length - 12} more
                  </span>
                )}
              </div>

              {/* Ignored keys */}
              {preview.meta.ignored.length > 0 && (
                <p className="text-xs text-[var(--text-muted)]">
                  Ignored: {preview.meta.ignored.join(', ')}
                </p>
              )}
            </div>
          )}

          {/* Success */}
          {imported && (
            <div className="flex items-center gap-2 px-3 py-2.5 rounded-[var(--radius)] bg-[var(--success)]/10 border border-[var(--success)]/20">
              <Check className="w-4 h-4 text-[var(--success)]" />
              <p className="text-sm text-[var(--success)] font-medium">
                Preset imported — {preview?.fieldCount} fields applied
              </p>
            </div>
          )}
        </div>

        {/* ── Footer ─────────────────────────────────────────────────── */}
        <div className="flex items-center justify-end gap-3 px-5 py-3 border-t border-[var(--border)]">
          <Button variant="ghost" size="sm" onClick={handleClose}>
            Cancel
          </Button>
          <Button
            variant="primary"
            size="sm"
            disabled={!preview || imported || !!error}
            onClick={handleImport}
          >
            <FileJson className="w-3.5 h-3.5" />
            Import &amp; Apply
          </Button>
        </div>
      </div>
    </div>
  )
}
