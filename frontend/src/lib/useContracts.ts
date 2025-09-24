'use client'

import { useAccount, useWriteContract, useReadContract } from 'wagmi'
import { CONTRACTS } from './contracts'
import { isAddress, parseUnits, formatUnits, Address } from 'viem'
import { useMemo, useState, useCallback, useEffect } from 'react'

// Common tokens for testing
export const COMMON_TOKENS = [
  {
    address: '0x32B9dB3C79340317b5F9A33eD2c599e63380283C' as const,
    name: 'Mock USDC',
    symbol: 'USDC',
    decimals: 6
  },
  {
    address: '0x0000000000000000000000000000000000000000' as const,
    name: 'Native Token',
    symbol: 'WLD',
    decimals: 18
  }
]

interface OrderData {
  amount: string;
  token: Address;
  startPrice: string;
  endPrice: string;
  recipientUpiAddress: string;
}

// Hook to read resolver fee from contract
export function useResolverFee() {
  const { data: resolverFee, isLoading, error } = useReadContract({
    ...CONTRACTS.ORDER_PROTOCOL,
    functionName: 'i_resolverFee',
    query: {
      staleTime: 1000 * 60 * 10, // 10 minutes - fee rarely changes
    }
  })

  return {
    resolverFee: resolverFee as number,
    isLoading,
    error
  }
}

// Utility function to calculate the exact token approval amount needed
// This matches the smart contract calculation in createOrder function with proper decimal handling
export function calculateApprovalAmount(
  inrAmount: string,      // Amount in INR (user input)
  endPrice: string,       // End price in INR per token (user input)
  resolverFee: number,    // Resolver fee in basis points (from contract)
  tokenDecimals: number   // Token decimals
): bigint {
  try {
    // Convert inputs to BigInt with proper decimals
    // Amount should be in 18 decimals (INR amount - always 18 decimals in contract)
    const amount = parseUnits(inrAmount, 18)
    
    // End price should be in 18 decimals (INR per token - always 18 decimals in contract)
    const endPriceBig = parseUnits(endPrice, 18)
    
    // Calculate token amount using the new contract logic:
    // tokenAmount = (inrAmount * 10^tokenDecimals) / priceInrPerToken
    const tokenAmount = (amount * (BigInt(10) ** BigInt(tokenDecimals))) / endPriceBig
    
    // Calculate resolver fee on the token amount
    // resolverFeeAmount = (tokenAmount * resolverFee) / 10000
    const feeAmount = (tokenAmount * BigInt(resolverFee)) / BigInt(10000)
    
    // Total amount to approve = tokenAmount + feeAmount
    const totalPayableAmount = tokenAmount + feeAmount
    
    return totalPayableAmount
  } catch (error) {
    console.error('Error calculating approval amount:', error)
    throw new Error('Failed to calculate approval amount')
  }
}

// Hook for reading maker details with optimized queries
export function useMakerDetails(makerAddress: string) {
  const isValidAddress = useMemo(() => isAddress(makerAddress), [makerAddress])
  
  const { data: isRegistered, isLoading: isLoadingRegistered, error: registeredError } = useReadContract({
    ...CONTRACTS.MAKER_REGISTRY,
    functionName: 'isMaker',
    args: isValidAddress ? [makerAddress as `0x${string}`] : undefined,
    query: { 
      enabled: isValidAddress,
      staleTime: 1000 * 60 * 2, // 2 minutes
      retry: (failureCount, error: Error) => {
        if (error?.message?.includes('rate limit')) {
          return failureCount < 1 // Only retry once for rate limits
        }
        return failureCount < 2
      }
    }
  })

  const { data: isForeigner, isLoading: isLoadingForeigner } = useReadContract({
    ...CONTRACTS.MAKER_REGISTRY,
    functionName: 's_isForiegner',
    args: isValidAddress ? [makerAddress as `0x${string}`] : undefined,
    query: { 
      enabled: isValidAddress && Boolean(isRegistered),
      staleTime: 1000 * 60 * 2, // 2 minutes
    }
  })

  const { data: upiAddress, isLoading: isLoadingUpi } = useReadContract({
    ...CONTRACTS.MAKER_REGISTRY,
    functionName: 's_upiAddress',
    args: isValidAddress ? [makerAddress as `0x${string}`] : undefined,
    query: { 
      enabled: isValidAddress && Boolean(isRegistered) && isForeigner === false,
      staleTime: 1000 * 60 * 2, // 2 minutes
    }
  })

  const { data: proof, isLoading: isLoadingProof } = useReadContract({
    ...CONTRACTS.MAKER_REGISTRY,
    functionName: 's_proof',
    args: isValidAddress ? [makerAddress as `0x${string}`] : undefined,
    query: { 
      enabled: isValidAddress && Boolean(isRegistered) && isForeigner === true,
      staleTime: 1000 * 60 * 2, // 2 minutes
    }
  })

  return {
    isRegistered: Boolean(isRegistered),
    isForeigner: Boolean(isForeigner),
    identityProof: isForeigner ? (proof as string) : (upiAddress as string),
    isLoading: isLoadingRegistered || isLoadingForeigner || isLoadingUpi || isLoadingProof,
    error: registeredError
  }
}

// Hook for checking resolver status with better caching
export function useResolverStatus(resolverAddress: string) {
  const isValidAddress = useMemo(() => isAddress(resolverAddress), [resolverAddress])

  const { data: isResolver, isLoading, error } = useReadContract({
    ...CONTRACTS.RESOLVER_REGISTRY,
    functionName: 'isResolver',
    args: isValidAddress ? [resolverAddress as `0x${string}`] : undefined,
    query: { 
      enabled: isValidAddress,
      staleTime: 1000 * 60 * 2, // 2 minutes
      retry: (failureCount, error: Error) => {
        if (error?.message?.includes('rate limit')) {
          return failureCount < 1
        }
        return failureCount < 2
      }
    }
  })

  return {
    isResolver: Boolean(isResolver),
    isLoading,
    error
  }
}

// Hook for admin contract operations with better error handling
export function useAdminOperations() {
  const { address } = useAccount()
  const { writeContract, isPending, error, isSuccess, reset } = useWriteContract()

  const handleContractWrite = async (contractCall: () => void) => {
    try {
      reset() // Clear previous errors
      await contractCall()
    } catch (err: unknown) {
      const error = err as Error
      // Handle rate limiting specifically
      if (error?.message?.includes('rate limit')) {
        throw new Error('Network is busy. Please wait a moment and try again.')
      }
      throw err
    }
  }

  const registerMaker = async (
    makerAddress: string,
    identityProof: string,
    isForeigner: boolean
  ) => {
    if (!isAddress(makerAddress)) {
      throw new Error('Invalid maker address')
    }

    return handleContractWrite(() => 
      writeContract({
        ...CONTRACTS.MAKER_REGISTRY,
        functionName: 'registerMaker',
        args: [identityProof, makerAddress as `0x${string}`, isForeigner]
      })
    )
  }

  const editMaker = async (
    makerAddress: string,
    newProof: string
  ) => {
    if (!isAddress(makerAddress)) {
      throw new Error('Invalid maker address')
    }

    return handleContractWrite(() =>
      writeContract({
        ...CONTRACTS.MAKER_REGISTRY,
        functionName: 'editMaker',
        args: [makerAddress as `0x${string}`, newProof]
      })
    )
  }

  const deleteMaker = async (makerAddress: string) => {
    if (!isAddress(makerAddress)) {
      throw new Error('Invalid maker address')
    }

    return handleContractWrite(() =>
      writeContract({
        ...CONTRACTS.MAKER_REGISTRY,
        functionName: 'editMaker',
        args: [makerAddress as `0x${string}`, ''] // Empty string deletes the maker
      })
    )
  }

  const addResolver = async (resolverAddress: string) => {
    if (!isAddress(resolverAddress)) {
      throw new Error('Invalid resolver address')
    }

    return handleContractWrite(() =>
      writeContract({
        ...CONTRACTS.RESOLVER_REGISTRY,
        functionName: 'addResolver',
        args: [resolverAddress as `0x${string}`]
      })
    )
  }

  const removeResolver = async (resolverAddress: string) => {
    if (!isAddress(resolverAddress)) {
      throw new Error('Invalid resolver address')
    }

    return handleContractWrite(() =>
      writeContract({
        ...CONTRACTS.RESOLVER_REGISTRY,
        functionName: 'removeResolver',
        args: [resolverAddress as `0x${string}`]
      })
    )
  }

  const addToken = async (tokenAddress: string) => {
    if (!isAddress(tokenAddress)) {
      throw new Error('Invalid token address')
    }

    return handleContractWrite(() =>
      writeContract({
        ...CONTRACTS.ORDER_PROTOCOL,
        functionName: 'addToken',
        args: [tokenAddress as `0x${string}`]
      })
    )
  }

  const removeToken = async (tokenAddress: string) => {
    if (!isAddress(tokenAddress)) {
      throw new Error('Invalid token address')
    }

    return handleContractWrite(() =>
      writeContract({
        ...CONTRACTS.ORDER_PROTOCOL,
        functionName: 'removeToken',
        args: [tokenAddress as `0x${string}`]
      })
    )
  }

  return {
    registerMaker,
    editMaker,
    deleteMaker,
    addResolver,
    removeResolver,
    addToken,
    removeToken,
    isPending,
    error,
    isSuccess,
    reset,
    connectedAddress: address
  }
}

// Hook for ERC20 token operations
export function useERC20(tokenAddress?: Address) {
  const { address: userAddress } = useAccount()
  
  const balanceResult = useReadContract({
    address: tokenAddress,
    abi: CONTRACTS.ERC20.abi,
    functionName: 'balanceOf',
    args: userAddress ? [userAddress] : undefined,
    query: {
      enabled: !!tokenAddress && !!userAddress,
      staleTime: 10000,
      refetchInterval: 10000
    }
  })

  const allowanceResult = useReadContract({
    address: tokenAddress,
    abi: CONTRACTS.ERC20.abi,
    functionName: 'allowance',
    args: userAddress ? [userAddress, CONTRACTS.ORDER_PROTOCOL.address] : undefined,
    query: {
      enabled: !!tokenAddress && !!userAddress,
      staleTime: 5000,
      refetchInterval: 5000
    }
  })

  const decimalsResult = useReadContract({
    address: tokenAddress,
    abi: CONTRACTS.ERC20.abi,
    functionName: 'decimals',
    query: {
      enabled: !!tokenAddress,
      staleTime: 300000 // 5 minutes - decimals don't change
    }
  })

  const { writeContract, error: approveError, isPending: approvePending } = useWriteContract()

  const approve = useCallback(async (amount: bigint) => {
    if (!tokenAddress) throw new Error('Token address not provided')
    
    return writeContract({
      address: tokenAddress,
      abi: CONTRACTS.ERC20.abi,
      functionName: 'approve',
      args: [CONTRACTS.ORDER_PROTOCOL.address, amount]
    })
  }, [tokenAddress, writeContract])

  return {
    balance: balanceResult.data,
    allowance: allowanceResult.data,
    decimals: decimalsResult.data,
    isLoading: balanceResult.isLoading || allowanceResult.isLoading || decimalsResult.isLoading,
    error: balanceResult.error || allowanceResult.error || decimalsResult.error || approveError,
    approve,
    isApproving: approvePending,
    refetch: () => {
      balanceResult.refetch()
      allowanceResult.refetch()
    }
  }
}

// Hook for creating orders
export function useCreateOrder() {
  const { writeContract, data: hash, error, isPending } = useWriteContract()
  const [isLoading, setIsLoading] = useState(false)

  const createOrder = useCallback(async (orderData: OrderData) => {
    try {
      setIsLoading(true)
      
      // According to smart contract, all amounts should be in 18 decimals:
      // _amount: INR amount in 18 decimals
      // _startPrice and _endPrice: token prices in INR in 18 decimals
      const amount = parseUnits(orderData.amount, 18) // INR amount in 18 decimals
      const startPrice = parseUnits(orderData.startPrice, 18) // Price in INR per token, 18 decimals
      const endPrice = parseUnits(orderData.endPrice, 18) // Price in INR per token, 18 decimals
      
      await writeContract({
        address: CONTRACTS.ORDER_PROTOCOL.address,
        abi: CONTRACTS.ORDER_PROTOCOL.abi,
        functionName: 'createOrder',
        args: [
          amount,
          orderData.token,
          startPrice,
          endPrice,
          orderData.recipientUpiAddress
        ]
      })
      
      // Return hash from the hook state
      return hash
    } catch (err) {
      console.error('Error creating order:', err)
      throw err
    } finally {
      setIsLoading(false)
    }
  }, [writeContract, hash])

  const saveOrderToDatabase = useCallback(async (orderData: {
    orderId: string;
    walletAddress: string;
    amount: string;
    tokenAddress: string;
    startPrice: string;
    endPrice: string;
    recipientUpiAddress: string;
    transactionHash: string;
    blockNumber: number;
  }) => {
    try {
      // Use the Next.js API route which proxies to the backend
      const response = await fetch('/api/orders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(orderData)
      })
      
      if (!response.ok) {
        throw new Error('Failed to save order to database')
      }
      
      return await response.json()
    } catch (err) {
      console.error('Error saving order to database:', err)
      throw err
    }
  }, [])

  return {
    createOrder,
    saveOrderToDatabase,
    isLoading: isLoading || isPending,
    error,
    hash
  }
}

// Hook for fetching orders from database
export function useOrders(walletAddress?: Address) {
  const [orders, setOrders] = useState([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  const fetchOrders = useCallback(async () => {
    if (!walletAddress) return
    
    try {
      setIsLoading(true)
      setError(null)
      
      // Use the Next.js API route which proxies to the backend
      const response = await fetch(`/api/orders/wallet/${walletAddress}`)
      if (!response.ok) {
        throw new Error('Failed to fetch orders from database')
      }
      
      const data = await response.json()
      setOrders(data.data?.orders || [])
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Unknown error'))
    } finally {
      setIsLoading(false)
    }
  }, [walletAddress])

  useEffect(() => {
    fetchOrders()
  }, [fetchOrders])

  return {
    orders,
    isLoading,
    error,
    refetch: fetchOrders
  }
}

// Hook for fetching order details from the smart contract
export function useOrderDetails(orderId: string | null) {
  const { data: orderData, isLoading, error, refetch } = useReadContract({
    ...CONTRACTS.ORDER_PROTOCOL,
    functionName: 'getOrder',
    args: orderId ? [orderId as `0x${string}`] : undefined,
    query: {
      enabled: !!orderId,
      staleTime: 1000 * 30, // 30 seconds
    }
  })

  const parsedOrder = useMemo(() => {
    if (!orderData || !Array.isArray(orderData)) return null
    
    // Parse the order struct returned from contract
    const [
      maker,
      taker,
      recipientUpiAddress,
      amount,
      token,
      startPrice,
      acceptedPrice,
      endPrice,
      startTime,
      acceptedTime,
      accepted,
      fullfilled
    ] = orderData

    return {
      maker: maker as string,
      taker: taker as string,
      recipientUpiAddress: recipientUpiAddress as string,
      amount: formatUnits(amount as bigint, 18), // INR amount is in 18 decimals
      token: token as string,
      startPrice: formatUnits(startPrice as bigint, 18),
      acceptedPrice: acceptedPrice ? formatUnits(acceptedPrice as bigint, 18) : '0',
      endPrice: formatUnits(endPrice as bigint, 18),
      startTime: Number(startTime),
      acceptedTime: Number(acceptedTime),
      accepted: accepted as boolean,
      fullfilled: fullfilled as boolean
    }
  }, [orderData])

  return {
    orderDetails: parsedOrder,
    isLoading,
    error,
    refetch
  }
}

// Utility functions
export function formatTokenAmount(amount: bigint | undefined, decimals: number = 18): string {
  if (!amount) return '0'
  return formatUnits(amount, decimals)
}

export function parseTokenAmount(amount: string, decimals: number = 18): bigint {
  return parseUnits(amount, decimals)
}