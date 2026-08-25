'use client'

export function PrintButton() {
  return (
    <button className="ghost noprint" type="button" onClick={() => window.print()}>
      Print / save as PDF
    </button>
  )
}
