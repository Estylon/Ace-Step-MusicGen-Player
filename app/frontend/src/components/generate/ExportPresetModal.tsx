import { useState, useCallback, useMemo } from 'react'
import { X, FileJson, Copy, Download, Check } from 'lucide-react'
import clsx from 'clsx'
import Button from '../ui/Button'
import { useGenerationStore } from '../../stores/useGenerationStore'

interface ExportPresetModalProps {
  open: boolean
  onClose: () => void
}

export default function ExportPresetModal({ open, onClose }: ExportPresetModalProps) {
  const exportPreset = useGenerationStore((s) => s.exportPreset)
  const caption = useGenerationStore((s) => s.form.caption)

  const [copied, setCopied] = useState(false)

  const json = useMemo(() => {
    if (!open) return ''
    return exportPreset({ title: caption.slice(0, 80) || undefined })
  }, [open, exportPreset, caption])

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(json)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // Fallback: select all text
      const textarea = document.querySelector<HTMLTextAreaElement>('#export-json-area')
      if (textarea) {
        textarea.select()
        document.execCommand('copy')
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
      }
    }
  }, [json])

  const handleDownload = useCallback(() => {
    const slug = (caption || 'preset').slice(0, 40).replace(/[^a-zA-Z0-9]+/g, '-').replace(/-+$/, '')
    const blob = new Blob([json], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${slug}.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }, [json, caption])

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
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
        {/* ── Header ────────────────────────────────────────── */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--border)]">
          <div className="flex items-center gap-2.5">
            <FileJson className="w-5 h-5 text-[var(--accent)]" />
            <h2 className="text-lg font-semibold text-[var(--text-primary)]">
              Export Preset
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-[var(--radius-sm)] text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)] transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* ── Body ──────────────────────────────────────────── */}
        <div className="flex flex-col gap-4 px-5 py-4 overflow-y-auto">
          <p className="text-sm text-[var(--text-muted)]">
            Copy or download the current form settings as a JSON preset.
            You can import it later to restore these exact settings.
          </p>

          <textarea
            id="export-json-area"
            readOnly
            value={json}
            spellCheck={false}
            className={clsx(
              'w-full rounded-[var(--radius)] px-3 py-2.5 text-sm font-mono',
              'bg-[var(--bg-secondary)] text-[var(--text-primary)]',
              'border border-[var(--border)]',
              'focus:outline-none focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent)]',
              'resize-y min-h-[240px] max-h-[400px]',
            )}
          />
        </div>

        {/* ── Footer ────────────────────────────────────────── */}
        <div className="flex items-center justify-end gap-3 px-5 py-3 border-t border-[var(--border)]">
          <Button variant="ghost" size="sm" onClick={onClose}>
            Close
          </Button>
          <Button variant="secondary" size="sm" onClick={handleDownload}>
            <Download className="w-3.5 h-3.5" />
            Download .json
          </Button>
          <Button variant="primary" size="sm" onClick={handleCopy}>
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5" />
                Copied!
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" />
                Copy to clipboard
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  )
}
