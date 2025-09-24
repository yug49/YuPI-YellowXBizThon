'use client'

import '@rainbow-me/rainbowkit/styles.css'
import {
  RainbowKitProvider,
  getDefaultConfig,
} from '@rainbow-me/rainbowkit'
import { WagmiProvider } from 'wagmi'
import {
  QueryClientProvider,
  QueryClient,
} from '@tanstack/react-query'
import { defineChain } from 'viem'

// Define Base Mainnet chain using viem's defineChain
export const baseMainnet = defineChain({
  id: 8453,
  name: 'Base',
  nativeCurrency: { name: 'ETH', symbol: 'ETH', decimals: 18 },
  rpcUrls: {
    default: { 
      http: [
        process.env.NEXT_PUBLIC_BASE_RPC_URL || 'https://mainnet.base.org',
        'https://mainnet.base.org', // Fallback public RPC
      ] 
    },
  },
  blockExplorers: {
    default: {
      name: 'Basescan',
      url: 'https://basescan.org',
    },
  },
  testnet: false,
})

const config = getDefaultConfig({
  appName: 'Order Protocol',
  projectId: process.env.NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID || 'e0e2f0c4b3d3f5a5b5f6a8b1c4d5e7f9',
  chains: [baseMainnet],
  ssr: true,
})

// Configure QueryClient with aggressive caching and retry logic
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes - data stays fresh longer
      gcTime: 1000 * 60 * 10, // 10 minutes - keep in cache longer
      retry: (failureCount, error: Error) => {
        // Don't retry on rate limit errors initially, wait longer
        const err = error as Error & { code?: number }
        if (err?.code === -32603 || err?.message?.includes('rate limit')) {
          return failureCount < 2 // Only retry twice for rate limits
        }
        return failureCount < 3
      },
      retryDelay: (attemptIndex, error: Error) => {
        // Exponential backoff with longer delays for rate limits
        const err = error as Error & { code?: number }
        const baseDelay = err?.code === -32603 ? 5000 : 1000 // 5s for rate limits, 1s for others
        return Math.min(1000 * (2 ** attemptIndex), 30000) + baseDelay
      },
      refetchOnWindowFocus: false, // Reduce unnecessary refetches
      refetchOnMount: false, // Don't refetch if data is still fresh
    },
  },
})

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider>
          {children}
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  )
}