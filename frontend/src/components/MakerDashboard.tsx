'use client'

import React, { useState } from 'react'
import { useAccount } from 'wagmi'
import { useMakerDetails } from '@/lib/useContracts'
import CreateOrder from '@/components/CreateOrder'
import OrdersList from '@/components/OrdersList'

export default function MakerDashboard() {
  const { address, isConnected } = useAccount()
  const { isRegistered, isForeigner, identityProof, isLoading, error } = useMakerDetails(address || '')
  const [activeTab, setActiveTab] = useState<'orders' | 'create'>('orders')
  const [refreshKey, setRefreshKey] = useState(0)

  const handleOrderCreated = (orderId?: string) => {
    // Refresh the orders list when a new order is created
    setRefreshKey(prev => prev + 1)
    
    // Don't switch tabs - stay on create tab to show processing/completion status
  }

  if (!isConnected) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h1 className="text-3xl font-bold text-gray-900 mb-4">Maker Dashboard</h1>
            <p className="text-gray-600 mb-8">Connect your wallet to access the maker dashboard</p>
            
            <div className="bg-white rounded-lg shadow-md p-8">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              </div>
              <p className="text-gray-600">Please connect your wallet to continue</p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h1 className="text-3xl font-bold text-gray-900 mb-8">Maker Dashboard</h1>
            <div className="bg-white rounded-lg shadow-md p-8">
              <div className="flex items-center justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                <span className="ml-2 text-gray-600">Loading maker details...</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h1 className="text-3xl font-bold text-gray-900 mb-8">Maker Dashboard</h1>
            <div className="bg-white rounded-lg shadow-md p-8">
              <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-red-600">Error loading maker details: {error.message}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (!isRegistered) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h1 className="text-3xl font-bold text-gray-900 mb-8">Maker Dashboard</h1>
            <div className="bg-white rounded-lg shadow-md p-8">
              <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.268 15.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
              </div>
              <h2 className="text-xl font-semibold text-gray-900 mb-2">Not Registered as Maker</h2>
              <p className="text-gray-600 mb-6">You need to be registered as a maker to access this dashboard.</p>
              <button
                onClick={() => window.location.href = '/register-maker'}
                className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
              >
                Register as Maker
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Maker Dashboard</h1>
          <p className="text-gray-600 mt-2">Manage your orders and create new ones</p>
          
          {/* Maker Info */}
          <div className="mt-4 bg-white rounded-lg shadow-md p-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-gray-900">Maker Details</h3>
                <p className="text-sm text-gray-600">Address: {address}</p>
                <p className="text-sm text-gray-600">
                  Type: {isForeigner ? 'International' : 'Domestic'}
                </p>
                {identityProof && (
                  <p className="text-sm text-gray-600">
                    {isForeigner ? 'Identity Proof' : 'UPI Address'}: {identityProof}
                  </p>
                )}
              </div>
              <div className="flex items-center">
                <div className="w-3 h-3 bg-green-400 rounded-full mr-2"></div>
                <span className="text-sm text-green-600 font-medium">Verified Maker</span>
              </div>
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="bg-white rounded-lg shadow-md mb-6">
          <div className="border-b border-gray-200">
            <nav className="flex">
              <button
                onClick={() => setActiveTab('orders')}
                className={`px-6 py-3 text-sm font-medium ${
                  activeTab === 'orders'
                    ? 'border-b-2 border-blue-500 text-blue-600'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                Your Orders
              </button>
              <button
                onClick={() => setActiveTab('create')}
                className={`px-6 py-3 text-sm font-medium ${
                  activeTab === 'create'
                    ? 'border-b-2 border-blue-500 text-blue-600'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                Create Order
              </button>
            </nav>
          </div>
        </div>

        {/* Tab Content */}
        <div className="space-y-6">
          {activeTab === 'orders' && (
            <div key={refreshKey}>
              <OrdersList />
            </div>
          )}
          
          {activeTab === 'create' && (
            <CreateOrder onOrderCreated={handleOrderCreated} />
          )}
        </div>
      </div>
    </div>
  )
}