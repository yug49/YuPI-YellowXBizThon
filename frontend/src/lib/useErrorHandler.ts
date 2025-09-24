'use client'

import { useState, useCallback } from 'react'

export interface ErrorState {
  message: string
  type: 'error' | 'warning' | 'info'
  isRateLimit?: boolean
}

export function useErrorHandler() {
  const [error, setError] = useState<ErrorState | null>(null)
  const [isShowingError, setIsShowingError] = useState(false)

  const handleError = useCallback((err: Error | unknown) => {
    let errorMessage = 'An unexpected error occurred'
    let errorType: 'error' | 'warning' | 'info' = 'error'
    let isRateLimit = false

    const error = err as Error & { code?: number }

    if (error?.code === -32603 || error?.message?.includes('rate limit')) {
      errorMessage = 'Network is busy. Please wait a moment and try again.'
      errorType = 'warning'
      isRateLimit = true
    } else if (error?.message?.includes('User rejected')) {
      errorMessage = 'Transaction was cancelled'
      errorType = 'info'
    } else if (error?.message?.includes('insufficient funds')) {
      errorMessage = 'Insufficient funds for transaction'
      errorType = 'error'
    } else if (error?.message?.includes('Invalid')) {
      errorMessage = error.message
      errorType = 'error'
    } else if (error?.message) {
      errorMessage = error.message
    }

    setError({ message: errorMessage, type: errorType, isRateLimit })
    setIsShowingError(true)

    // Auto-hide info messages after 3 seconds
    if (errorType === 'info') {
      setTimeout(() => {
        setIsShowingError(false)
      }, 3000)
    }
  }, [])

  const clearError = useCallback(() => {
    setError(null)
    setIsShowingError(false)
  }, [])

  return {
    error,
    isShowingError,
    handleError,
    clearError
  }
}