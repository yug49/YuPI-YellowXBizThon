'use client'

import { ConnectButton } from '@rainbow-me/rainbowkit'
import { useAccount, useBalance, useChainId, useSwitchChain } from 'wagmi'
import { baseMainnet } from './Providers'

export function WalletConnection() {
  const { address, isConnected } = useAccount()
  const chainId = useChainId()
  const { switchChain } = useSwitchChain()
  const { data: balance } = useBalance({
    address: address,
    chainId: baseMainnet.id,
  })

  const isCorrectNetwork = chainId === baseMainnet.id
  // Always show ETH as symbol for Base Mainnet
  const balanceFormatted = balance
    ? `${parseFloat(balance.formatted).toFixed(4)} ETH`
    : '0.0000 ETH'

  const handleSwitchNetwork = () => {
    switchChain({ chainId: baseMainnet.id })
  }

  return (
    <div className="flex items-center gap-4">
      {/* Network Warning */}
      {isConnected && !isCorrectNetwork && (
        <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
          <div className="w-2 h-2 bg-red-500 rounded-full"></div>
          <span className="text-red-700 text-sm font-medium">Wrong Network</span>
          <button
            onClick={handleSwitchNetwork}
            className="bg-red-500 text-white px-3 py-1 rounded text-sm hover:bg-red-600 transition-colors"
          >
            Switch to Base Mainnet
          </button>
        </div>
      )}

      {/* Correct Network Indicator */}
      {isConnected && isCorrectNetwork && (
        <div className="flex items-center gap-2 bg-green-50 border border-green-200 rounded-lg px-3 py-2">
          <div className="w-2 h-2 bg-green-500 rounded-full"></div>
          <span className="text-green-700 text-sm font-medium">Base Mainnet</span>
        </div>
      )}

      {/* Balance Display */}
      {isConnected && isCorrectNetwork && (
        <div className="bg-gray-50 border border-gray-200 rounded-lg px-3 py-2">
          <div className="text-sm text-gray-600">Balance</div>
          <div className="font-mono text-sm text-gray-600 font-medium">{balanceFormatted}</div>
        </div>
      )}

      {/* Connect Button */}
      <ConnectButton.Custom>
        {({
          account,
          chain,
          openAccountModal,
          openChainModal,
          openConnectModal,
          authenticationStatus,
          mounted,
        }) => {
          // Note: If your app doesn't use authentication, you
          // can remove all 'authenticationStatus' checks
          const ready = mounted && authenticationStatus !== 'loading'
          const connected =
            ready &&
            account &&
            chain &&
            (!authenticationStatus ||
              authenticationStatus === 'authenticated')

          return (
            <div
              {...(!ready && {
                'aria-hidden': true,
                'style': {
                  opacity: 0,
                  pointerEvents: 'none',
                  userSelect: 'none',
                },
              })}
            >
              {(() => {
                if (!connected) {
                  return (
                    <button 
                      onClick={openConnectModal} 
                      type="button"
                      className="bg-blue-500 text-white px-6 py-2 rounded-lg font-medium hover:bg-blue-600 transition-colors"
                    >
                      Connect Wallet
                    </button>
                  )
                }

                if (chain.unsupported) {
                  return (
                    <button 
                      onClick={openChainModal} 
                      type="button"
                      className="bg-red-500 text-white px-6 py-2 rounded-lg font-medium hover:bg-red-600 transition-colors"
                    >
                      Wrong network
                    </button>
                  )
                }

                return (
                  <div className="flex items-center gap-2">
                    <button
                      onClick={openAccountModal}
                      type="button"
                      className="bg-gray-100 hover:bg-gray-200 text-gray-800 px-4 py-2 rounded-lg font-medium transition-colors"
                    >
                      {account.displayName}
                      {account.displayBalance
                        ? ` (${account.displayBalance})`
                        : ''}
                    </button>
                  </div>
                )
              })()}
            </div>
          )
        }}
      </ConnectButton.Custom>
    </div>
  )
}