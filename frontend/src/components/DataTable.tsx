import React, { useState, useMemo } from 'react'
import { ChevronUp, ChevronDown, ChevronsUpDown } from 'lucide-react'

export interface Column<T> {
  key: string
  header: React.ReactNode
  render?: (row: T) => React.ReactNode
  sortable?: boolean
  sortValue?: (row: T) => number | string
  align?: 'left' | 'center' | 'right'
  className?: string
}

export interface DataTableProps<T> {
  columns: Column<T>[]
  data: T[]
  keyField?: keyof T | ((row: T) => string | number)
  defaultSortKey?: string
  defaultSortDir?: 'asc' | 'desc'
  className?: string
  emptyMessage?: string
}

export function DataTable<T>({
  columns,
  data,
  keyField = 'id' as unknown as keyof T,
  defaultSortKey,
  defaultSortDir = 'asc',
  className = '',
  emptyMessage = 'No data available',
}: DataTableProps<T>) {
  const [sortKey, setSortKey] = useState<string | null>(defaultSortKey || null)
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>(defaultSortDir)

  const handleSort = (key: string) => {
    if (sortKey === key) {
      setSortDir(d => (d === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortKey(key)
      setSortDir('asc')
    }
  }

  const sortedData = useMemo(() => {
    if (!sortKey) return data
    const col = columns.find(c => c.key === sortKey)
    if (!col || !col.sortable) return data

    return [...data].sort((a, b) => {
      const getVal = col.sortValue ?? ((row: T) => (row as Record<string, unknown>)[sortKey])
      const valA = getVal(a)
      const valB = getVal(b)

      if (valA === null || valA === undefined) return 1
      if (valB === null || valB === undefined) return -1
      if (valA < valB) return sortDir === 'asc' ? -1 : 1
      if (valA > valB) return sortDir === 'asc' ? 1 : -1
      return 0
    })
  }, [data, columns, sortKey, sortDir])

  return (
    <div className={`w-full overflow-x-auto rounded-xl border border-border bg-surface ${className}`}>
      <table className="w-full text-left text-sm border-collapse">
        <thead>
          <tr className="border-b border-border bg-elevated/50 text-xs font-semibold text-muted uppercase tracking-wider">
            {columns.map(col => {
              const isSorted = sortKey === col.key
              const alignClass = {
                left: 'text-left',
                center: 'text-center',
                right: 'text-right',
              }[col.align || 'left']

              if (!col.sortable) {
                return (
                  <th key={col.key} className={`py-3 px-4 ${alignClass} ${col.className || ''}`}>
                    {col.header}
                  </th>
                )
              }

              return (
                <th
                  key={col.key}
                  aria-sort={isSorted ? (sortDir === 'asc' ? 'ascending' : 'descending') : 'none'}
                  className={`py-3 px-4 ${alignClass} ${col.className || ''}`}
                >
                  <button
                    type="button"
                    onClick={() => handleSort(col.key)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault()
                        handleSort(col.key)
                      }
                    }}
                    className="inline-flex items-center gap-1.5 font-semibold text-muted hover:text-text focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-teal rounded"
                  >
                    <span>{col.header}</span>
                    <span className="text-muted/60">
                      {isSorted ? (
                        sortDir === 'asc' ? <ChevronUp size={14} className="text-teal" /> : <ChevronDown size={14} className="text-teal" />
                      ) : (
                        <ChevronsUpDown size={14} />
                      )}
                    </span>
                  </button>
                </th>
              )
            })}
          </tr>
        </thead>
        <tbody className="divide-y divide-border/60">
          {sortedData.length === 0 ? (
            <tr>
              <td colSpan={columns.length} className="py-8 text-center text-muted">
                {emptyMessage}
              </td>
            </tr>
          ) : (
            sortedData.map((row, idx) => {
              const rowKey = typeof keyField === 'function' ? keyField(row) : String((row as Record<string, unknown>)[keyField as string] ?? idx)
              return (
                <tr key={rowKey} className="hover:bg-elevated/40 transition-colors">
                  {columns.map(col => {
                    const alignClass = {
                      left: 'text-left',
                      center: 'text-center',
                      right: 'text-right',
                    }[col.align || 'left']
                    return (
                      <td key={col.key} className={`py-3 px-4 ${alignClass} ${col.className || ''}`}>
                        {col.render ? col.render(row) : String((row as Record<string, unknown>)[col.key] ?? '')}
                      </td>
                    )
                  })}
                </tr>
              )
            })
          )}
        </tbody>
      </table>
    </div>
  )
}
