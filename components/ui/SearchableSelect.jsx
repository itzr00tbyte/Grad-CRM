'use client'

import { useState, useMemo, useRef, useEffect } from 'react'

export function SearchableSelect({
  label,
  name,
  options = [],
  value = '',
  required = false,
  placeholder = 'Type to search school account...',
}) {
  const initialSelected = useMemo(() => {
    return options.find(([v]) => String(v) === String(value))
  }, [options, value])

  const [searchTerm, setSearchTerm] = useState(initialSelected ? initialSelected[1] : '')
  const [selectedVal, setSelectedVal] = useState(value ? String(value) : '')
  const [isOpen, setIsOpen] = useState(false)
  const containerRef = useRef(null)

  // Keep search term in sync if initial value changes
  useEffect(() => {
    const found = options.find(([v]) => String(v) === String(value))
    if (found) {
      setSelectedVal(String(found[0]))
      setSearchTerm(found[1])
    }
  }, [value, options])

  // Filter options based on user typing
  const filteredOptions = useMemo(() => {
    if (!searchTerm || (selectedVal && options.find(([v, t]) => String(v) === selectedVal && t === searchTerm))) {
      return options
    }
    const term = searchTerm.toLowerCase().trim()
    return options.filter(([, text]) => String(text).toLowerCase().includes(term))
  }, [options, searchTerm, selectedVal])

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(e) {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false)
        // If user typed something but didn't select, revert to selected text or clear if invalid
        const match = options.find(([v]) => String(v) === selectedVal)
        if (match) {
          setSearchTerm(match[1])
        } else {
          setSearchTerm('')
          setSelectedVal('')
        }
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [options, selectedVal])

  const handleSelect = (val, text) => {
    setSelectedVal(String(val))
    setSearchTerm(text)
    setIsOpen(false)
  }

  const handleInputChange = (e) => {
    const val = e.target.value
    setSearchTerm(val)
    setSelectedVal('') // Reset until user selects a valid option
    setIsOpen(true)
  }

  return (
    <div className="field" ref={containerRef} style={{ position: 'relative' }}>
      {label && (
        <label htmlFor={`ss_${name}`}>
          {label}
          {required && <span style={{ color: 'var(--bad-fg)', marginLeft: 2 }}>*</span>}
        </label>
      )}

      {/* Hidden input to pass selected ID to parent form submission */}
      <input type="hidden" name={name} value={selectedVal} required={required} />

      <div style={{ position: 'relative' }}>
        <input
          id={`ss_${name}`}
          type="text"
          value={searchTerm}
          onChange={handleInputChange}
          onFocus={() => setIsOpen(true)}
          placeholder={placeholder}
          autoComplete="off"
          style={{ paddingRight: 30 }}
        />
        {searchTerm && (
          <button
            type="button"
            onClick={() => {
              setSearchTerm('')
              setSelectedVal('')
              setIsOpen(true)
            }}
            style={{
              position: 'absolute',
              right: 8,
              top: '50%',
              transform: 'translateY(-50%)',
              background: 'transparent',
              border: 0,
              color: 'var(--ink-muted)',
              cursor: 'pointer',
              fontSize: 14,
              padding: 2,
            }}
          >
            ✕
          </button>
        )}
      </div>

      {/* Dropdown Options List */}
      {isOpen && (
        <div
          style={{
            position: 'absolute',
            top: '100%',
            left: 0,
            right: 0,
            zIndex: 100,
            background: 'var(--surface)',
            border: '1px solid var(--line)',
            borderRadius: 'var(--r-sm)',
            boxShadow: 'var(--shadow-md)',
            maxHeight: 220,
            overflowY: 'auto',
            marginTop: 4,
          }}
        >
          {filteredOptions.length === 0 ? (
            <div className="muted" style={{ padding: '10px 12px', fontSize: 12 }}>
              No school matching "{searchTerm}"
            </div>
          ) : (
            filteredOptions.map(([val, text]) => (
              <div
                key={val}
                onClick={() => handleSelect(val, text)}
                style={{
                  padding: '8px 12px',
                  cursor: 'pointer',
                  fontSize: 13,
                  background: String(val) === selectedVal ? 'var(--blue-light)' : 'transparent',
                  fontWeight: String(val) === selectedVal ? 600 : 400,
                  color: String(val) === selectedVal ? 'var(--blue)' : 'var(--ink)',
                  borderBottom: '1px solid var(--line-soft)',
                }}
                className="select-option-item"
              >
                {text}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  )
}
