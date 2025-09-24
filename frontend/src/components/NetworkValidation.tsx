'use client'

import { useAccount, useChainId, useSwitchChain } from 'wagmi'
import { baseMainnet } from './Providers'

export function NetworkValidation({ children }: { children: React.ReactNode }) {
  const { isConnected } = useAccount()
  const chainId = useChainId()
  const { switchChain } = useSwitchChain()

  const isCorrectNetwork = chainId === baseMainnet.id

  const handleSwitchNetwork = () => {
    switchChain({ chainId: baseMainnet.id })
  }

  // If not connected, show the app normally
  if (!isConnected) {
    return <>{children}</>
  }

  // If connected but wrong network, show warning overlay
  if (!isCorrectNetwork) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="container mx-auto px-4 py-8">
          <div className="max-w-md mx-auto bg-white rounded-lg shadow-lg p-8 text-center">
            <div className="mb-6">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.464 0L4.732 18.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
              </div>
              <h2 className="text-2xl font-bold text-gray-800 mb-2">Wrong Network Detected</h2>
              <p className="text-gray-600 mb-6">
                This application only works on <strong>Base Mainnet</strong>. 
                Please switch your wallet to the correct network to continue.
              </p>
            </div>

            <div className="space-y-4">
              <button
                onClick={handleSwitchNetwork}
                className="w-full bg-blue-500 text-white py-3 px-6 rounded-lg font-medium hover:bg-blue-600 transition-colors"
              >
                Switch to Base Mainnet
              </button>
              
              <div className="text-sm text-gray-500">
                <p><strong>Network:</strong> Base Mainnet</p>
                <p><strong>Chain ID:</strong> 8453</p>
                <p><strong>Currency:</strong> ETH</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // If connected and correct network, show the app
  return <>{children}</>
}