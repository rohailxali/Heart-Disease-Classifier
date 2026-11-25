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
  caption: string
  columns: Column<T>[]
  data: T[]
  keyField?: keyof T | ((row: T) => string | number)
  defaultSortKey?: string
  defaultSortDir?: 'asc' | 'desc'
  className?: string
  emptyMessage?: string
}

export function DataTable<T>({
  caption,
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
      const getVal = col.sortValue ?? ((row: T) => (row as Record<string, unknown>)[sortKey] as string | number)
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
    <div className={`w-full border-t border-b border-rule bg-surface ${className}`}>
      <div className="px-4 py-2.5 text-xs marginalia border-b border-rule/70">
        {caption}
      </div>
      <div className="w-full overflow-x-auto">
        <table className="w-full text-left text-sm border-collapse">
          <caption className="sr-only">{caption}</caption>
        <thead>
          <tr className="border-b border-rule text-[11px] font-mono font-medium text-muted uppercase tracking-wider">
            {columns.map(col => {
              const isSorted = sortKey === col.key
              const alignClass = {
                left: 'text-left',
                center: 'text-center',
                right: 'text-right',
              }[col.align || 'left']

              if (!col.sortable) {
                return (
                  <th key={col.key} scope="col" className={`py-2.5 px-3.5 ${alignClass} ${col.className || ''}`}>
                    {col.header}
                  </th>
                )
              }

              return (
                <th
                  key={col.key}
                  scope="col"
                  aria-sort={isSorted ? (sortDir === 'asc' ? 'ascending' : 'descending') : 'none'}
                  className={`py-2.5 px-3.5 ${alignClass} ${col.className || ''}`}
                >
                  <button
                    type="button"
                    onClick={() => handleSort(col.key)}
                    className="inline-flex items-center gap-1 font-mono font-medium text-muted hover:text-ink uppercase tracking-wider focus-visible:outline-none rounded-[1px]"
                  >
                    <span>{col.header}</span>
                    <span className="text-muted/70" aria-hidden="true">
                      {isSorted ? (
                        sortDir === 'asc' ? <ChevronUp size={13} className="text-ink" /> : <ChevronDown size={13} className="text-ink" />
                      ) : (
                        <ChevronsUpDown size={13} />
                      )}
                    </span>
                  </button>
                </th>
              )
            })}
          </tr>
        </thead>
        <tbody className="divide-y divide-rule/50">
          {sortedData.length === 0 ? (
            <tr>
              <td colSpan={columns.length} className="py-8 text-center text-muted text-xs font-mono">
                {emptyMessage}
              </td>
            </tr>
          ) : (
            sortedData.map((row, idx) => {
              const rowKey = typeof keyField === 'function'
                ? keyField(row)
                : String((row as Record<string, unknown>)[keyField as string] ?? idx)
              return (
                <tr key={rowKey} className="hover:bg-ink/[0.03] transition-colors">
                  {columns.map(col => {
                    const alignClass = {
                      left: 'text-left',
                      center: 'text-center',
                      right: 'text-right',
                    }[col.align || 'left']
                    return (
                      <td key={col.key} className={`py-2.5 px-3.5 ${alignClass} ${col.className || ''}`}>
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
    </div>
  )
}
