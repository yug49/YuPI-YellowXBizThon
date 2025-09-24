'use client'

import React, { useState } from 'react'
import { useAccount } from 'wagmi'
import { useOrders, useOrderDetails, COMMON_TOKENS } from '@/lib/useContracts'
import { YellowConnectionIndicator, YellowSessionStatus } from '../../yellow/session-ui.js'

interface DatabaseOrder {
  orderId: string;
  amount: string;
  tokenAddress: string;
  startPrice: string;
  endPrice: string;
  recipientUpiAddress: string;
  transactionHash?: string;
  blockNumber?: number;
  walletAddress?: string;
  status?: string;
  createdAt?: string;
}

interface ContractOrder {
  maker: string;
  taker: string;
  recipientUpiAddress: string;
  amount: string;
  token: string;
  startPrice: string;
  acceptedPrice: string;
  endPrice: string;
  startTime: number;
  acceptedTime: number;
  accepted: boolean;
  fullfilled: boolean;
}

export default function OrdersList() {
  const { address } = useAccount()
  const { orders, isLoading, error, refetch } = useOrders(address)
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null)
  const { orderDetails, isLoading: detailsLoading, error: detailsError } = useOrderDetails(selectedOrderId)
  
  // Mock Yellow Network status for demo - in real implementation this would come from context
  const yellowStatus = { connected: false, authenticated: false }

  if (isLoading) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">Your Orders</h2>
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <span className="ml-2 text-gray-600">Loading orders from database...</span>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">Your Orders</h2>
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-red-600">Error loading orders: {error.message}</p>
          <button
            onClick={refetch}
            className="mt-2 text-red-600 hover:text-red-800 underline"
          >
            Try again
          </button>
        </div>
      </div>
    )
  }

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'created':
        return 'bg-blue-100 text-blue-800'
      case 'accepted':
        return 'bg-yellow-100 text-yellow-800'
      case 'fulfilled':
        return 'bg-green-100 text-green-800'
      case 'failed':
        return 'bg-red-100 text-red-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const getTokenSymbol = (tokenAddress: string) => {
    const token = COMMON_TOKENS.find(t => t.address.toLowerCase() === tokenAddress.toLowerCase())
    return token?.symbol || 'Unknown'
  }

  const handleOrderClick = (orderId: string) => {
    setSelectedOrderId(selectedOrderId === orderId ? null : orderId)
  }

  const formatDate = (timestamp: number) => {
    return new Date(timestamp * 1000).toLocaleString()
  }

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-2xl font-bold text-gray-900">Your Orders</h2>
        <div className="flex items-center gap-3">
          <YellowConnectionIndicator 
            status={yellowStatus.connected ? 'connected' : 'disconnected'}
          />
          <button
            onClick={refetch}
            className="text-blue-600 hover:text-blue-800 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </button>
        </div>
      </div>

      {orders.length === 0 ? (
        <div className="text-center py-8">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No orders yet</h3>
          <p className="text-gray-600">Create your first order to get started.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {orders.map((order: DatabaseOrder, index: number) => (
            <div key={order.orderId || index} className="border border-gray-200 rounded-lg overflow-hidden">
              {/* Order Summary - Always visible */}
              <div 
                className="p-4 hover:bg-gray-50 transition-colors cursor-pointer"
                onClick={() => handleOrderClick(order.orderId)}
              >
                <div className="flex justify-between items-start mb-3">
                  <div className="flex-1">
                    <h4 className="font-semibold text-gray-900">
                      ₹{order.amount} → {getTokenSymbol(order.tokenAddress)}
                    </h4>
                    <p className="text-sm text-gray-600 font-mono break-all">
                      ID: {order.orderId}
                    </p>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(order.status || 'created')}`}>
                      {order.status || 'created'}
                    </span>
                    <svg 
                      className={`w-4 h-4 text-gray-400 transition-transform ${selectedOrderId === order.orderId ? 'transform rotate-180' : ''}`} 
                      fill="none" 
                      stroke="currentColor" 
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <p className="text-gray-600">Start Price</p>
                    <p className="font-medium">₹{order.startPrice}</p>
                  </div>
                  <div>
                    <p className="text-gray-600">End Price</p>
                    <p className="font-medium">₹{order.endPrice}</p>
                  </div>
                  <div>
                    <p className="text-gray-600">UPI Address</p>
                    <p className="font-medium break-all">{order.recipientUpiAddress}</p>
                  </div>
                  <div>
                    <p className="text-gray-600">Created</p>
                    <p className="font-medium">
                      {order.createdAt ? new Date(order.createdAt).toLocaleDateString() : 'Unknown'}
                    </p>
                  </div>
                </div>

                {order.transactionHash && (
                  <div className="mt-3 pt-3 border-t border-gray-100">
                    <p className="text-xs text-gray-600">Transaction Hash:</p>
                    <p className="text-xs font-mono text-gray-800 break-all">
                      {order.transactionHash}
                    </p>
                  </div>
                )}
              </div>

              {/* Contract Details - Expandable */}
              {selectedOrderId === order.orderId && (
                <div className="border-t border-gray-200 p-4 bg-gray-50">
                  <h5 className="font-semibold text-gray-900 mb-3 flex items-center">
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Contract Details
                  </h5>
                  
                  {detailsLoading ? (
                    <div className="flex items-center py-4">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mr-2"></div>
                      <span className="text-sm text-gray-600">Fetching details from blockchain...</span>
                    </div>
                  ) : detailsError ? (
                    <div className="p-3 bg-red-50 border border-red-200 rounded">
                      <p className="text-red-600 text-sm">Error: {detailsError.message}</p>
                    </div>
                  ) : orderDetails ? (
                    <div className="space-y-4">
                      {/* Status Information */}
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <p className="text-gray-600">Order Status</p>
                          <div className="flex items-center mt-1">
                            <div className={`w-2 h-2 rounded-full mr-2 ${orderDetails.accepted ? 'bg-yellow-400' : 'bg-blue-400'}`}></div>
                            <span className="font-medium">
                              {orderDetails.fullfilled ? 'Completed' : orderDetails.accepted ? 'Accepted' : 'Open'}
                            </span>
                          </div>
                        </div>
                        <div>
                          <p className="text-gray-600">Maker Address</p>
                          <p className="font-mono text-xs break-all">{orderDetails.maker}</p>
                        </div>
                      </div>

                      {/* Price Information */}
                      <div className="grid grid-cols-3 gap-4 text-sm">
                        <div>
                          <p className="text-gray-600">Amount (INR)</p>
                          <p className="font-medium">₹{orderDetails.amount}</p>
                        </div>
                        <div>
                          <p className="text-gray-600">Start Price</p>
                          <p className="font-medium">₹{orderDetails.startPrice}</p>
                        </div>
                        <div>
                          <p className="text-gray-600">End Price</p>
                          <p className="font-medium">₹{orderDetails.endPrice}</p>
                        </div>
                      </div>

                      {/* Timing Information */}
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <p className="text-gray-600">Order Created</p>
                          <p className="font-medium">{formatDate(orderDetails.startTime)}</p>
                        </div>
                        {orderDetails.accepted && orderDetails.acceptedTime > 0 && (
                          <div>
                            <p className="text-gray-600">Accepted At</p>
                            <p className="font-medium">{formatDate(orderDetails.acceptedTime)}</p>
                          </div>
                        )}
                      </div>

                      {/* Accepted Price and Taker Info */}
                      {orderDetails.accepted && (
                        <div className="border-t border-gray-200 pt-4">
                          <h6 className="font-medium text-gray-900 mb-2">Acceptance Details</h6>
                          <div className="grid grid-cols-2 gap-4 text-sm">
                            <div>
                              <p className="text-gray-600">Accepted Price</p>
                              <p className="font-medium text-green-600">₹{orderDetails.acceptedPrice}</p>
                            </div>
                            <div>
                              <p className="text-gray-600">Taker Address</p>
                              <p className="font-mono text-xs break-all">{orderDetails.taker}</p>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Token Information */}
                      <div className="border-t border-gray-200 pt-4">
                        <h6 className="font-medium text-gray-900 mb-2">Token Details</h6>
                        <div className="text-sm">
                          <p className="text-gray-600">Token Address</p>
                          <p className="font-mono text-xs break-all">{orderDetails.token}</p>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <p className="text-sm text-gray-600">No contract details available</p>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}