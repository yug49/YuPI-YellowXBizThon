'use client'

import Link from 'next/link'
import { useAccount } from 'wagmi'
import { ConnectButton } from '@rainbow-me/rainbowkit'
import { useMakerDetails } from '@/lib/useContracts'

export default function Navigation() {
  const { address, isConnected } = useAccount()
  const { isRegistered } = useMakerDetails(address || '')

  return (
    <nav className="bg-white border-b border-gray-200 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo/Brand */}
          <div className="flex items-center">
            <Link href="/" className="text-xl font-bold text-gray-900">
              Order Protocol
            </Link>
          </div>

          {/* Navigation Links */}
          <div className="hidden md:block">
            <div className="ml-10 flex items-baseline space-x-4">
              <Link
                href="/"
                className="text-gray-600 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium transition-colors"
              >
                Home
              </Link>
              
              {isConnected && isRegistered && (
                <Link
                  href="/maker-dashboard"
                  className="text-gray-600 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium transition-colors"
                >
                  Maker Dashboard
                </Link>
              )}
              
              {isConnected && !isRegistered && (
                <Link
                  href="/register-maker"
                  className="bg-blue-600 text-white hover:bg-blue-700 px-3 py-2 rounded-md text-sm font-medium transition-colors"
                >
                  Register as Maker
                </Link>
              )}
            </div>
          </div>

          {/* Connect Wallet Button */}
          <div className="flex items-center">
            <ConnectButton />
          </div>
        </div>
      </div>

      {/* Mobile menu */}
      <div className="md:hidden">
        <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3">
          <Link
            href="/"
            className="text-gray-600 hover:text-gray-900 block px-3 py-2 rounded-md text-base font-medium"
          >
            Home
          </Link>
          
          {isConnected && isRegistered && (
            <Link
              href="/maker-dashboard"
              className="text-gray-600 hover:text-gray-900 block px-3 py-2 rounded-md text-base font-medium"
            >
              Maker Dashboard
            </Link>
          )}
          
          {isConnected && !isRegistered && (
            <Link
              href="/register-maker"
              className="bg-blue-600 text-white hover:bg-blue-700 block px-3 py-2 rounded-md text-base font-medium"
            >
              Register as Maker
            </Link>
          )}
        </div>
      </div>
    </nav>
  )
}