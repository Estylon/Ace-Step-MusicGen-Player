import type { ReactNode } from 'react'
import Sidebar from './Sidebar'
import PlayerBar from './PlayerBar'

interface AppShellProps {
  children: ReactNode
}

export default function AppShell({ children }: AppShellProps) {
  return (
    <div className="flex h-screen overflow-hidden bg-[var(--bg-primary)]">
      {/* Sidebar */}
      <Sidebar />

      {/* Main content area */}
      <div className="flex flex-col flex-1 min-w-0">
        {/* Scrollable content */}
        <main
          className="flex-1 overflow-y-auto"
          style={{ paddingBottom: 'var(--player-height)' }}
        >
          {children}
        </main>
      </div>

      {/* Player bar fixed at bottom */}
      <PlayerBar />
    </div>
  )
}
