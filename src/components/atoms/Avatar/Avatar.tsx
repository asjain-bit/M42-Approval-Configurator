import React, { useState } from 'react'
import type { AvatarProps } from './Avatar.types'

/**
 * Avatar — Atom
 * Visual representation of an individual user or entity.
 * Used in: SiteHeader, SettingsPanel
 */
export const Avatar = React.forwardRef<HTMLElement, AvatarProps>(
  ({ src, alt, fallback, size = 'md', className = '', ...rest }, ref) => {
    const [hasError, setHasError] = useState(false)

    const sizeClasses = {
      sm: 'h-8 w-8 text-xs',
      md: 'h-10 w-10 text-sm',
      lg: 'h-12 w-12 text-base',
    }[size]

    const baseClasses =
      'inline-flex items-center justify-center rounded-full font-medium overflow-hidden border border-border-default select-none'

    if (src && !hasError) {
      return (
        <img
          ref={ref as React.Ref<HTMLImageElement>}
          src={src}
          alt={alt || fallback}
          onError={() => setHasError(true)}
          className={`${baseClasses} ${sizeClasses} object-cover ${className}`.trim()}
          {...(rest as React.ImgHTMLAttributes<HTMLImageElement>)}
        />
      )
    }

    return (
      <span
        ref={ref as React.Ref<HTMLSpanElement>}
        role="img"
        aria-label={alt || fallback}
        className={`${baseClasses} ${sizeClasses} bg-bg-surface-3 text-text-primary ${className}`.trim()}
        {...rest}
      >
        {fallback.slice(0, 2).toUpperCase()}
      </span>
    )
  }
)

Avatar.displayName = 'Avatar'
