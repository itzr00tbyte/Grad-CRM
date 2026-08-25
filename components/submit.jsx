'use client'

import { useFormStatus } from 'react-dom'

export function SubmitButton({ children, className, style, ...rest }) {
  const { pending } = useFormStatus()
  return (
    <button
      type="submit"
      className={className}
      style={style}
      disabled={pending}
      {...rest}
    >
      {pending ? 'Saving...' : children}
    </button>
  )
}
