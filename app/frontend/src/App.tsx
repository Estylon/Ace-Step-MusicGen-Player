import { Routes, Route, Navigate } from 'react-router-dom'
import { useEffect } from 'react'
import AppShell from './components/layout/AppShell'
import ErrorBoundary from './components/shared/ErrorBoundary'
import GeneratePage from './components/generate/GeneratePage'
import StemSeparatorPage from './components/stems/StemSeparatorPage'
import LibraryPage from './components/library/LibraryPage'
import SettingsPage from './components/settings/SettingsPage'
import { useSettingsStore } from './stores/useSettingsStore'

export default function App() {
  const fetchStatus = useSettingsStore((s) => s.fetchModelStatus)

  useEffect(() => {
    fetchStatus()
  }, [fetchStatus])

  return (
    <ErrorBoundary>
      <AppShell>
        <Routes>
          <Route path="/" element={<Navigate to="/generate" replace />} />
          <Route path="/generate" element={<GeneratePage />} />
          <Route path="/stems" element={<StemSeparatorPage />} />
          <Route path="/library" element={<LibraryPage />} />
          <Route path="/settings" element={<SettingsPage />} />
        </Routes>
      </AppShell>
    </ErrorBoundary>
  )
}
