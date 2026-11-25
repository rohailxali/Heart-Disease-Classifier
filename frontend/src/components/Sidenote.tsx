import React, { useState, useId } from 'react'

interface SidenoteProps {
  index: string | number
  children: React.ReactNode
  className?: string
}

/**
 * Tufte-style marginalia: renders in the outer margin on wide viewports (>=1200px)
 * and acts as an accessible inline toggle footnote on smaller screens.
 */
export function Sidenote({ index, children, className = '' }: SidenoteProps) {
  const [open, setOpen] = useState(false)
  const noteId = useId()

  return (
    <span className={`inline ${className}`}>
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        aria-expanded={open}
        aria-controls={noteId}
        title="Toggle marginal note"
        className="sidenote-btn"
      >
        [{index}]
      </button>
      <span
        id={noteId}
        role="note"
        className={`sidenote-body ${open ? 'is-open' : ''}`}
      >
        <span className="font-mono text-[11px] not-italic text-ochreInk mr-1.5">[{index}]</span>
        {children}
      </span>
    </span>
  )
}
