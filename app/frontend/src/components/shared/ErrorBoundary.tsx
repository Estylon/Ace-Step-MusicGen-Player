import { Component, type ErrorInfo, type ReactNode } from 'react'
import { AlertTriangle } from 'lucide-react'
import Button from '../ui/Button'

interface ErrorBoundaryProps {
  children: ReactNode
  fallback?: ReactNode
}

interface ErrorBoundaryState {
  hasError: boolean
  error: Error | null
}

export default class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[ErrorBoundary] Caught error:', error, info.componentStack)
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null })
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback
      }

      return (
        <div className="flex flex-col items-center justify-center gap-4 p-8 min-h-[200px]">
          <div className="flex items-center justify-center w-12 h-12 rounded-full bg-[var(--error-muted)]">
            <AlertTriangle className="h-6 w-6 text-[var(--error)]" />
          </div>
          <div className="text-center">
            <h3 className="text-base font-semibold text-[var(--text-primary)] mb-1">
              Something went wrong
            </h3>
            <p className="text-sm text-[var(--text-muted)] max-w-md">
              {this.state.error?.message || 'An unexpected error occurred.'}
            </p>
          </div>
          <Button variant="secondary" size="sm" onClick={this.handleReset}>
            Try Again
          </Button>
        </div>
      )
    }

    return this.props.children
  }
}
