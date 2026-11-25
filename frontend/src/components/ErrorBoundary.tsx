import React, { Component, ErrorInfo, ReactNode } from 'react'
import { AlertTriangle, RefreshCw } from 'lucide-react'
import { Button } from './Button'
import { Card } from './Card'

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
          <Card className="max-w-md w-full p-6 text-center space-y-4 border-rose-500/30">
            <div className="w-12 h-12 rounded-full bg-rose-500/10 text-rose-400 mx-auto flex items-center justify-center">
              <AlertTriangle size={24} />
            </div>
            <h2 className="text-lg font-bold text-text">Something went wrong</h2>
            <p className="text-sm text-muted">
              {this.state.error?.message || 'An unexpected rendering error occurred in this view.'}
            </p>
            <div className="pt-2 flex justify-center gap-3">
              <Button variant="secondary" size="sm" onClick={() => window.location.reload()}>
                <RefreshCw size={14} className="mr-1.5" />
                Reload Page
              </Button>
              <Button variant="primary" size="sm" onClick={this.handleReset}>
                Return to Overview
              </Button>
            </div>
          </Card>
        </div>
      )
    }

    return this.props.children
  }
}
