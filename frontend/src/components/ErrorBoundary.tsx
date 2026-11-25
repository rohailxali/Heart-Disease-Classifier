import React, { Component, ErrorInfo, ReactNode } from 'react'
import { AlertTriangle, RefreshCw } from 'lucide-react'
import { Button } from './Button'

interface Props {
  children: ReactNode
}

interface State {
  hasError: boolean
  error: Error | null
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  }

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error in UI:', error, errorInfo)
  }

  public handleReset = () => {
    this.setState({ hasError: false, error: null })
    window.location.hash = '#/'
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-[50vh] flex items-center justify-center p-6">
          <div className="max-w-md w-full p-6 border-t border-b border-oxblood bg-surface text-center space-y-4">
            <div className="w-10 h-10 border border-oxblood/40 text-oxblood mx-auto flex items-center justify-center">
              <AlertTriangle size={20} />
            </div>
            <h2 className="font-display text-xl font-bold text-ink">View interrupted</h2>
            <p className="text-sm text-muted">
              {this.state.error?.message || 'An unexpected rendering error occurred in this section.'}
            </p>
            <div className="pt-2 flex justify-center gap-3">
              <Button variant="secondary" size="sm" onClick={() => window.location.reload()}>
                <RefreshCw size={14} />
                Reload
              </Button>
              <Button variant="primary" size="sm" onClick={this.handleReset}>
                Return to Notebook
              </Button>
            </div>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}
