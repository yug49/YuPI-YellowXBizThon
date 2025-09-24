"use client";

import { useState } from 'react';

// Mock data for orders
const mockLiveOrders = [
  {
    id: 1,
    maker: '0x1234...5678',
    amount: '1000',
    tokenAddress: '0xA0b8...1234',
    currentPrice: '950',
    timeLeft: '2h 30m'
  },
  {
    id: 2,
    maker: '0x9876...5432',
    amount: '500',
    tokenAddress: '0xB1c9...5678',
    currentPrice: '475',
    timeLeft: '45m'
  },
  {
    id: 3,
    maker: '0x5555...9999',
    amount: '2000',
    tokenAddress: '0xC2d8...9012',
    currentPrice: '1800',
    timeLeft: '1h 15m'
  }
];

const mockAcceptedOrders = [
  {
    id: 4,
    maker: '0x1111...2222',
    amount: '750',
    tokenAddress: '0xD3e7...3456',
    acceptedPrice: '700',
    status: 'pending_fulfillment'
  },
  {
    id: 5,
    maker: '0x3333...4444',
    amount: '1200',
    tokenAddress: '0xE4f6...7890',
    acceptedPrice: '1150',
    status: 'pending_fulfillment'
  }
];

export default function ResolverTab() {
  const [activeSubTab, setActiveSubTab] = useState('live');
  const [selectedOrder, setSelectedOrder] = useState<number | null>(null);
  const [proof, setProof] = useState('');

  const handleAcceptOrder = (orderId: number) => {
    alert(`Order ${orderId} accepted! (Mock implementation)`);
    console.log(`Accepting order ${orderId}`);
  };

  const handleFulfillOrder = (orderId: number) => {
    if (!proof.trim()) {
      alert('Please enter proof before fulfilling the order');
      return;
    }
    alert(`Order ${orderId} fulfilled with proof: ${proof} (Mock implementation)`);
    setProof('');
    setSelectedOrder(null);
  };

  return (
    <div className="max-w-4xl mx-auto">
      <h2 className="text-2xl font-bold mb-6 text-gray-800">Resolver Dashboard</h2>
      
      {/* Sub-tabs */}
      <div className="flex mb-6 bg-gray-100 rounded-lg p-1">
        <button
          onClick={() => setActiveSubTab('live')}
          className={`flex-1 py-2 px-4 rounded-md font-medium transition-colors ${
            activeSubTab === 'live'
              ? 'bg-white text-blue-600 shadow-sm'
              : 'text-gray-600 hover:text-gray-800'
          }`}
        >
          Live Orders
        </button>
        <button
          onClick={() => setActiveSubTab('accepted')}
          className={`flex-1 py-2 px-4 rounded-md font-medium transition-colors ${
            activeSubTab === 'accepted'
              ? 'bg-white text-blue-600 shadow-sm'
              : 'text-gray-600 hover:text-gray-800'
          }`}
        >
          Accepted Orders
        </button>
      </div>

      {/* Live Orders Tab */}
      {activeSubTab === 'live' && (
        <div>
          <h3 className="text-lg font-semibold mb-4 text-gray-700">Live Auction Orders</h3>
          <div className="space-y-4">
            {mockLiveOrders.map((order) => (
              <div key={order.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-center">
                  <div>
                    <p className="text-sm text-gray-600">Maker</p>
                    <p className="font-medium">{order.maker}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Amount (INR)</p>
                    <p className="font-medium">₹{order.amount}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Current Price</p>
                    <p className="font-medium text-green-600">₹{order.currentPrice}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Time Left</p>
                    <p className="font-medium text-orange-600">{order.timeLeft}</p>
                  </div>
                </div>
                <div className="mt-4">
                  <p className="text-sm text-gray-600 mb-2">Token Address</p>
                  <p className="font-mono text-sm bg-gray-100 p-2 rounded">{order.tokenAddress}</p>
                </div>
                <div className="mt-4 flex justify-end">
                  <button
                    onClick={() => handleAcceptOrder(order.id)}
                    className="bg-blue-500 text-white px-6 py-2 rounded-lg hover:bg-blue-600 transition-colors"
                  >
                    Accept Order
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Accepted Orders Tab */}
      {activeSubTab === 'accepted' && (
        <div>
          <h3 className="text-lg font-semibold mb-4 text-gray-700">Accepted Orders - Ready to Fulfill</h3>
          <div className="space-y-4">
            {mockAcceptedOrders.map((order) => (
              <div key={order.id} className="border border-gray-200 rounded-lg p-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center mb-4">
                  <div>
                    <p className="text-sm text-gray-600">Maker</p>
                    <p className="font-medium">{order.maker}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Amount (INR)</p>
                    <p className="font-medium">₹{order.amount}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Accepted Price</p>
                    <p className="font-medium text-green-600">₹{order.acceptedPrice}</p>
                  </div>
                </div>
                
                <div className="mb-4">
                  <p className="text-sm text-gray-600 mb-2">Token Address</p>
                  <p className="font-mono text-sm bg-gray-100 p-2 rounded">{order.tokenAddress}</p>
                </div>

                {/* Fulfillment Section */}
                <div className="border-t pt-4">
                  <h4 className="font-medium mb-3 text-gray-700">Fulfill Order</h4>
                  <div className="space-y-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Proof of Payment/Transfer
                      </label>
                      <textarea
                        value={selectedOrder === order.id ? proof : ''}
                        onChange={(e) => {
                          setProof(e.target.value);
                          setSelectedOrder(order.id);
                        }}
                        placeholder="Enter proof of payment or transaction hash..."
                        rows={3}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <button
                      onClick={() => handleFulfillOrder(order.id)}
                      className="bg-green-500 text-white px-6 py-2 rounded-lg hover:bg-green-600 transition-colors"
                    >
                      Submit Fulfillment
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Empty state */}
      {((activeSubTab === 'live' && mockLiveOrders.length === 0) || 
        (activeSubTab === 'accepted' && mockAcceptedOrders.length === 0)) && (
        <div className="text-center py-12">
          <p className="text-gray-500 text-lg">
            {activeSubTab === 'live' ? 'No live orders available' : 'No accepted orders to fulfill'}
          </p>
        </div>
      )}
    </div>
  );
}