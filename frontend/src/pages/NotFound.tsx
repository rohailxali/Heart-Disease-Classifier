import { Link } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { Button } from '../components/Button'

export default function NotFound() {
  return (
    <div className="min-h-[60vh] flex items-center justify-center p-6">
      <div className="max-w-md w-full border-t border-b border-rule py-10 px-6 text-center space-y-4 bg-surface">
        <div className="font-mono text-xs uppercase tracking-widest text-muted">
          404 · Unindexed Page
        </div>
        <h1 className="font-display text-2xl font-bold text-ink">Entry not found in this notebook</h1>
        <p className="text-sm text-muted">
          The requested route does not exist. Return to the main narrative scroll, data workbench, or patient consultation sheet.
        </p>
        <div className="pt-3 flex justify-center gap-3 flex-wrap">
          <Link to="/">
            <Button variant="primary" size="md">
              <ArrowLeft size={16} />
              Return to Notebook
            </Button>
          </Link>
          <Link to="/workbench">
            <Button variant="secondary" size="md">
              Open Workbench
            </Button>
          </Link>
        </div>
      </div>
    </div>
  )
}
