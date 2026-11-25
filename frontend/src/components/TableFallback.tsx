import React from 'react'

interface TableFallbackProps {
  caption: string
  headers: string[]
  rows: (string | number)[][]
}

/**
 * Screen-reader-only accessible data table fallback for charts.
 */
export function TableFallback({ caption, headers, rows }: TableFallbackProps) {
  return (
    <div className="sr-only">
      <table>
        <caption>{caption}</caption>
        <thead>
          <tr>
            {headers.map((h, i) => (
              <th key={i} scope="col">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, rIdx) => (
            <tr key={rIdx}>
              {row.map((cell, cIdx) => (
                <td key={cIdx}>{cell}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
