import { Link } from 'react-router-dom'
import { FileQuestion, ArrowLeft } from 'lucide-react'
import { Card } from '../components/Card'
import { Button } from '../components/Button'

export default function NotFound() {
  return (
    <div className="min-h-[60vh] flex items-center justify-center p-6">
      <Card className="max-w-md w-full p-8 text-center space-y-4">
        <div className="w-16 h-16 rounded-2xl bg-teal/10 text-teal mx-auto flex items-center justify-center">
          <FileQuestion size={32} />
        </div>
        <h1 className="text-xl font-bold text-text">Page Not Found</h1>
        <p className="text-sm text-muted">
          The requested page or view route does not exist in this replication dashboard.
        </p>
        <div className="pt-2">
          <Link to="/">
            <Button variant="primary" size="md">
              <ArrowLeft size={16} />
              Back to Overview
            </Button>
          </Link>
        </div>
      </Card>
    </div>
  )
}
