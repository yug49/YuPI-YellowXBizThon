'use client'

import React, { useState, useEffect, useMemo } from 'react'
import { useAccount, useWaitForTransactionReceipt, useWatchContractEvent } from 'wagmi'
import { useCreateOrder, useERC20, useResolverFee, calculateApprovalAmount, COMMON_TOKENS, formatTokenAmount } from '@/lib/useContracts'
import { Address } from 'viem'
import { CONTRACTS } from '@/lib/contracts'

interface CreateOrderProps {
  onOrderCreated?: (orderId: string) => void
}

export default function CreateOrder({ onOrderCreated }: CreateOrderProps) {
  const { address } = useAccount()
  const { createOrder, saveOrderToDatabase, isLoading: isCreatingOrder, error: createOrderError, hash } = useCreateOrder()
  
  // Get resolver fee from contract
  const { resolverFee } = useResolverFee()
  
  // Wait for transaction receipt when hash is available
  const { data: receipt, isSuccess: isReceiptSuccess } = useWaitForTransactionReceipt({
    hash,
  })
  
  // Form state
  const [formData, setFormData] = useState({
    amount: '',
    token: COMMON_TOKENS[0].address, // Default to MockUSDC
    startPrice: '',
    endPrice: '',
    recipientUpiAddress: ''
  })
  
  // Token operations
  const { 
    balance, 
    allowance, 
    decimals, 
    approve, 
    isApproving, 
    error: tokenError,
    refetch: refetchToken
  } = useERC20(formData.token as Address)
  
  const [step, setStep] = useState<'form' | 'approve' | 'approved' | 'create' | 'success' | 'fulfilled'>('form')
  const [txHash, setTxHash] = useState<string>('')
  const [orderId, setOrderId] = useState<string>('')
  const [fulfillmentProof, setFulfillmentProof] = useState<string>('')

  // For initial testing, use full wallet balance as approval amount
  const approvalAmount = useMemo(() => {
    if (!formData.amount || !formData.endPrice || !resolverFee || !decimals) {
      return BigInt(0)
    }
    
    try {
      // Calculate the exact amount needed based on the new contract logic
      return calculateApprovalAmount(
        formData.amount,
        formData.endPrice,
        resolverFee,
        decimals
      )
    } catch (error) {
      console.error('Error calculating approval amount:', error)
      return BigInt(0)
    }
  }, [formData.amount, formData.endPrice, resolverFee, decimals])

  // Check if approval is needed
  const needsApproval = formData.amount && formData.endPrice && balance && allowance !== undefined && approvalAmount > BigInt(0)
    ? approvalAmount > (allowance as bigint)
    : false

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
  }

  const validateForm = (): boolean => {
    if (!formData.amount || !formData.startPrice || !formData.endPrice || !formData.recipientUpiAddress) {
      return false
    }
    
    if (!balance || !decimals) {
      return false
    }
    
    const amountNum = parseFloat(formData.amount)
    const startPriceNum = parseFloat(formData.startPrice)
    const endPriceNum = parseFloat(formData.endPrice)
    
    // Validate positive numbers
    if (amountNum <= 0 || startPriceNum <= 0 || endPriceNum <= 0) {
      return false
    }
    
    // Validate Dutch auction: start price > end price
    if (startPriceNum <= endPriceNum) {
      return false
    }
    
    // Check if user has enough tokens
    if (approvalAmount > BigInt(0) && balance && approvalAmount > (balance as bigint)) {
      return false
    }
    
    return true
  }

  const handleApprove = async () => {
    try {
      setStep('approve')
      if (!decimals || approvalAmount === BigInt(0)) {
        throw new Error('Token data not loaded or invalid approval amount')
      }
      
      console.log('Approving full balance amount:', approvalAmount.toString())
      const approvalHash = await approve(approvalAmount)
      
      console.log('Approval transaction:', approvalHash)
      
      // Wait for approval transaction to be confirmed
      setTimeout(() => {
        refetchToken()
        setStep('approved') // New step to show approval complete
      }, 3000)
    } catch (error) {
      console.error('Approval failed:', error)
      setStep('form')
    }
  }

  const handleCreateOrder = async () => {
    try {
      setStep('create')
      
      // Create order on blockchain
      await createOrder({
        amount: formData.amount,
        token: formData.token as Address,
        startPrice: formData.startPrice,
        endPrice: formData.endPrice,
        recipientUpiAddress: formData.recipientUpiAddress
      })
      
      console.log('Order creation initiated')
      // Receipt handling is now done via useEffect below
      
    } catch (error) {
      console.error('Order creation failed:', error)
      setStep('form')
    }
  }

  // Handle receipt when transaction is confirmed
  useEffect(() => {
    if (isReceiptSuccess && receipt && step === 'create') {
      console.log('Transaction confirmed:', receipt)
      
      // Extract the real order ID from the OrderCreated event
      let actualOrderId = ''
      if (receipt.logs && receipt.logs.length > 0) {
        console.log('📝 All transaction logs:', receipt.logs)
        
        // Find the OrderCreated event log
        const orderCreatedLog = receipt.logs.find(log => 
          log.address?.toLowerCase() === CONTRACTS.ORDER_PROTOCOL.address.toLowerCase() &&
          log.topics && log.topics.length > 1
        )
        
        console.log('🎯 Found OrderCreated log:', orderCreatedLog)
        
        if (orderCreatedLog && orderCreatedLog.topics[1]) {
          actualOrderId = orderCreatedLog.topics[1] // This is the real orderId from the event
          console.log('✅ Extracted real order ID from blockchain:', actualOrderId)
        } else {
          console.log('⚠️ Could not find OrderCreated event in logs')
        }
      } else {
        console.log('⚠️ No logs found in receipt')
      }
      
      // Fallback to generated ID if we can't extract from logs
      if (!actualOrderId) {
        actualOrderId = `order_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
        console.log('Using fallback order ID:', actualOrderId)
      }
      
      // Save to database with actual transaction data
      saveOrderToDatabase({
        orderId: actualOrderId,
        walletAddress: address || '',
        amount: formData.amount,
        tokenAddress: formData.token, // Fixed: use tokenAddress instead of token
        startPrice: formData.startPrice,
        endPrice: formData.endPrice,
        recipientUpiAddress: formData.recipientUpiAddress,
        transactionHash: receipt.transactionHash,
        blockNumber: Number(receipt.blockNumber)
      })
      .then(() => {
        setOrderId(actualOrderId)
        setStep('success')
        
        console.log('🎯 Order ID set for event listening:', actualOrderId)
        console.log('📡 Event listener should now be active for this order ID')
        
        if (onOrderCreated) {
          onOrderCreated(actualOrderId)
        }
      })
      .catch((error) => {
        console.error('Failed to save order to database:', error)
        setStep('form')
      })
    }
  }, [isReceiptSuccess, receipt, step, address, formData, saveOrderToDatabase, onOrderCreated])

  // Listen for OrderFullfilled events
  useWatchContractEvent({
    ...CONTRACTS.ORDER_PROTOCOL,
    eventName: 'OrderFullfilled',
    enabled: orderId !== '' && step === 'success', // Only listen when we have an order ID and are in success state
    onLogs(logs) {
      console.log('🔔 OrderFullfilled event detected:', logs)
      console.log('📋 Current order ID being watched:', orderId)
      console.log('📊 Current step:', step)
      
      // Check if any of the events match our current order
      logs.forEach((log, index) => {
        console.log(`Event ${index + 1}:`, {
          orderId: log.args.orderId,
          taker: log.args.taker,
          proof: log.args.proof,
          transactionHash: log.transactionHash,
          blockNumber: log.blockNumber
        })
        
        const eventOrderId = log.args.orderId as string
        console.log(`🔍 Comparing: "${eventOrderId}" === "${orderId}"`, eventOrderId === orderId)
      })
      
      const matchingEvent = logs.find(log => {
        const eventOrderId = log.args.orderId as string
        return eventOrderId === orderId && orderId !== ''
      })
      
      if (matchingEvent) {
        console.log('✅ Found matching event for our order!', matchingEvent)
        if (step === 'success') {
          console.log('✅ Setting fulfillment proof and transitioning to fulfilled state')
          setFulfillmentProof(matchingEvent.args.proof as string)
          setStep('fulfilled')
        } else {
          console.log('⚠️ Event found but step is not "success", current step:', step)
        }
      } else {
        console.log('❌ No matching event found for our order')
      }
    }
  })

  // Debug effect to track state changes
  useEffect(() => {
    console.log('🔄 State change:', { step, orderId, fulfillmentProof })
  }, [step, orderId, fulfillmentProof])

  const resetForm = () => {
    setFormData({
      amount: '',
      token: COMMON_TOKENS[0].address,
      startPrice: '',
      endPrice: '',
      recipientUpiAddress: ''
    })
    setStep('form')
    setTxHash('')
    setOrderId('')
    setFulfillmentProof('')
  }

  if (step === 'success') {
    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="text-center">
          <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-blue-600 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </div>
          <h3 className="text-xl font-semibold text-gray-900 mb-2">Processing Payment...</h3>
          <p className="text-gray-600 mb-4">Your order has been created and is waiting for a resolver to accept and process the payment.</p>
          
          <div className="bg-gray-50 rounded-lg p-4 mb-4">
            <p className="text-sm text-gray-600">Order ID:</p>
            <p className="font-mono text-sm">{orderId}</p>
            
            {txHash && (
              <>
                <p className="text-sm text-gray-600 mt-2">Transaction Hash:</p>
                <p className="font-mono text-sm break-all">{txHash}</p>
              </>
            )}
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
            <div className="flex items-center mb-2">
              <div className="w-4 h-4 bg-blue-500 rounded-full mr-2 animate-pulse"></div>
              <span className="text-blue-700 font-medium">Waiting for payment processing...</span>
            </div>
            <p className="text-sm text-blue-600">
              A resolver will accept your order and process the UPI payment to {formData.recipientUpiAddress}. 
              You'll be notified once the payment is complete.
            </p>
          </div>
          
          <button
            onClick={resetForm}
            className="bg-gray-600 text-white px-6 py-2 rounded-lg hover:bg-gray-700 transition-colors"
          >
            Create Another Order
          </button>
        </div>
      </div>
    )
  }

  if (step === 'fulfilled') {
    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h3 className="text-xl font-semibold text-gray-900 mb-2">Payment Complete! 🎉</h3>
          <p className="text-gray-600 mb-4">Your order has been successfully fulfilled and the payment has been processed.</p>
          
          <div className="bg-gray-50 rounded-lg p-4 mb-4">
            <p className="text-sm text-gray-600">Order ID:</p>
            <p className="font-mono text-sm">{orderId}</p>
            
            {txHash && (
              <>
                <p className="text-sm text-gray-600 mt-2">Transaction Hash:</p>
                <p className="font-mono text-sm break-all">{txHash}</p>
              </>
            )}
          </div>

          <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
            <h4 className="font-medium text-green-800 mb-2">Payment Proof</h4>
            <div className="bg-white border border-green-200 rounded p-3">
              <p className="text-sm text-gray-600 mb-1">Proof of Payment:</p>
              <p className="font-mono text-sm text-green-700 break-all">{fulfillmentProof}</p>
            </div>
            <p className="text-sm text-green-600 mt-2">
              ✅ Payment to {formData.recipientUpiAddress} has been successfully processed
            </p>
          </div>
          
          <button
            onClick={resetForm}
            className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            Create Another Order
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h2 className="text-2xl font-bold text-gray-900 mb-6">Create New Order</h2>
      
      {/* Step indicator */}
      <div className="flex items-center mb-6">
        <div className={`flex items-center ${step === 'form' ? 'text-blue-600' : 'text-gray-400'}`}>
          <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
            step === 'form' ? 'bg-blue-600 text-white' : 'bg-gray-200'
          }`}>
            1
          </div>
          <span className="ml-2">Form</span>
        </div>
        
        <div className="flex-1 h-px bg-gray-200 mx-4"></div>
        
        <div className={`flex items-center ${step === 'approve' || step === 'approved' || step === 'create' ? 'text-blue-600' : 'text-gray-400'}`}>
          <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
            step === 'approve' || step === 'approved' || step === 'create' ? 'bg-blue-600 text-white' : 'bg-gray-200'
          }`}>
            2
          </div>
          <span className="ml-2">Approve</span>
        </div>
        
        <div className="flex-1 h-px bg-gray-200 mx-4"></div>
        
        <div className={`flex items-center ${step === 'create' || step === 'approved' ? 'text-blue-600' : 'text-gray-400'}`}>
          <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
            step === 'create' || step === 'approved' ? 'bg-blue-600 text-white' : 'bg-gray-200'
          }`}>
            3
          </div>
          <span className="ml-2">Create</span>
        </div>
      </div>

      <form className="space-y-4">
        {/* Token Selection */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Token
          </label>
          <select
            name="token"
            value={formData.token}
            onChange={handleInputChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {COMMON_TOKENS.map((token) => (
              <option key={token.address} value={token.address}>
                {token.name} ({token.symbol})
              </option>
            ))}
          </select>
        </div>

        {/* Amount */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            INR Amount
          </label>
          <input
            type="number"
            name="amount"
            value={formData.amount}
            onChange={handleInputChange}
            placeholder="100.00"
            step="0.01"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <p className="text-xs text-gray-500 mt-1">
            Amount in Indian Rupees (INR) you want to send
          </p>
          {balance && decimals !== undefined && (
            <p className="text-sm text-gray-500 mt-1">
              Token Balance: {formatTokenAmount(balance as bigint, decimals)} {COMMON_TOKENS.find(t => t.address === formData.token)?.symbol}
            </p>
          )}
          {approvalAmount > BigInt(0) && decimals !== undefined && (
            <p className="text-sm text-blue-600 mt-1">
              Required tokens: {formatTokenAmount(approvalAmount, decimals)} {COMMON_TOKENS.find(t => t.address === formData.token)?.symbol}
            </p>
          )}
        </div>

        {/* Start Price */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Start Price (INR per {COMMON_TOKENS.find(t => t.address === formData.token)?.symbol || 'Token'})
          </label>
          <input
            type="number"
            name="startPrice"
            value={formData.startPrice}
            onChange={handleInputChange}
            placeholder="90.00"
            step="0.01"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <p className="text-xs text-gray-500 mt-1">
            Starting price in INR per token (Dutch auction starts high)
          </p>
        </div>

        {/* End Price */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            End Price (INR per {COMMON_TOKENS.find(t => t.address === formData.token)?.symbol || 'Token'})
          </label>
          <input
            type="number"
            name="endPrice"
            value={formData.endPrice}
            onChange={handleInputChange}
            placeholder="80.00"
            step="0.01"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <p className="text-xs text-gray-500 mt-1">
            Ending price in INR per token (Dutch auction ends low)
          </p>
          <p className="text-xs text-orange-600 mt-1">
            <strong>Note:</strong> Start price must be higher than end price for the Dutch auction mechanism
          </p>
        </div>

        {/* Approval Calculation Info */}
        {needsApproval && approvalAmount > BigInt(0) && decimals !== undefined && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h4 className="font-medium text-blue-800 mb-2">Token Approval Required</h4>
            <p className="text-sm text-blue-700 mb-2">
              Based on your INR amount ({formData.amount}) and end price ({formData.endPrice} INR/{COMMON_TOKENS.find(t => t.address === formData.token)?.symbol}):
            </p>
            <div className="text-sm text-blue-600 space-y-1">
              <p>
                <strong>Required tokens:</strong> {formatTokenAmount(approvalAmount, decimals)} {COMMON_TOKENS.find(t => t.address === formData.token)?.symbol}
              </p>
              <p className="text-xs text-blue-500">
                (Includes worst-case scenario calculation + {resolverFee ? (resolverFee / 100) : 1}% resolver fee)
              </p>
            </div>
          </div>
        )}

        {/* UPI Address */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Recipient UPI Address
          </label>
          <input
            type="text"
            name="recipientUpiAddress"
            value={formData.recipientUpiAddress}
            onChange={handleInputChange}
            placeholder="user@paytm"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Error Messages */}
        {(createOrderError || tokenError) && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-red-600 text-sm">
              {createOrderError?.message || tokenError?.message}
            </p>
          </div>
        )}

        {/* Insufficient Balance Warning */}
        {approvalAmount > BigInt(0) && balance && approvalAmount > (balance as bigint) && (
          <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
            <p className="text-yellow-600 text-sm">
              <strong>Insufficient balance:</strong> You need {formatTokenAmount(approvalAmount, decimals || 18)} {COMMON_TOKENS.find(t => t.address === formData.token)?.symbol} but only have {formatTokenAmount(balance as bigint, decimals || 18)}.
            </p>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-4 pt-4">
          {step === 'form' && (
            <>
              {needsApproval ? (
                <button
                  type="button"
                  onClick={handleApprove}
                  disabled={!validateForm() || isApproving}
                  className="flex-1 bg-yellow-600 text-white py-2 px-4 rounded-lg hover:bg-yellow-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
                >
                  {isApproving ? 'Approving...' : 'Approve Token'}
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleCreateOrder}
                  disabled={!validateForm() || isCreatingOrder}
                  className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
                >
                  {isCreatingOrder ? 'Creating Order...' : 'Create Order'}
                </button>
              )}
            </>
          )}
          
          {step === 'approve' && (
            <div className="flex-1 bg-yellow-100 text-yellow-800 py-2 px-4 rounded-lg text-center">
              Waiting for approval confirmation...
            </div>
          )}
          
          {step === 'approved' && (
            <>
              <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg">
                <div className="flex items-center">
                  <div className="w-5 h-5 bg-green-400 rounded-full mr-2"></div>
                  <span className="text-green-800 font-medium">Token approval successful!</span>
                </div>
                <p className="text-green-700 text-sm mt-1">
                  You can now proceed to create your order.
                </p>
              </div>
              <button
                type="button"
                onClick={handleCreateOrder}
                disabled={isCreatingOrder}
                className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
              >
                {isCreatingOrder ? 'Creating Order...' : 'Create Order Now'}
              </button>
            </>
          )}
          
          {step === 'create' && (
            <div className="flex-1 bg-blue-100 text-blue-800 py-2 px-4 rounded-lg text-center">
              Creating order...
            </div>
          )}
        </div>
      </form>
    </div>
  )
}