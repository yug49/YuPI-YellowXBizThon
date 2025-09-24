"use client";

import { useAccount } from 'wagmi';
import { useMakerDetails } from '@/lib/useContracts';
import Link from 'next/link';

export default function MakerTab() {
  const { address, isConnected } = useAccount();
  const { isRegistered, isLoading, error } = useMakerDetails(address || '');

  if (!isConnected) {
    return (
      <div className="max-w-2xl mx-auto text-center">
        <h2 className="text-2xl font-bold mb-6 text-gray-800">Maker Dashboard</h2>
        <div className="p-6 bg-yellow-50 border border-yellow-200 rounded-lg">
          <p className="text-yellow-800 mb-4">Please connect your wallet to access maker features</p>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="max-w-2xl mx-auto text-center">
        <h2 className="text-2xl font-bold mb-6 text-gray-800">Maker Dashboard</h2>
        <div className="p-6 bg-gray-50 rounded-lg">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
            <span className="ml-2 text-gray-600">Checking maker status...</span>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-2xl mx-auto text-center">
        <h2 className="text-2xl font-bold mb-6 text-gray-800">Maker Dashboard</h2>
        <div className="p-6 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-red-800">Error checking maker status: {error.message}</p>
        </div>
      </div>
    );
  }

  if (!isRegistered) {
    return (
      <div className="max-w-2xl mx-auto text-center">
        <h2 className="text-2xl font-bold mb-6 text-gray-800">Maker Dashboard</h2>
        <div className="p-6 bg-yellow-50 border border-yellow-200 rounded-lg">
          <h3 className="text-lg font-semibold mb-4 text-yellow-800">Not Registered as Maker</h3>
          <p className="text-yellow-700 mb-6">You need to register as a maker to create orders.</p>
          <p className="text-sm text-gray-600 mb-4">Use the admin registration form above to register as a maker first.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto text-center">
      <h2 className="text-2xl font-bold mb-6 text-gray-800">Maker Dashboard</h2>
      
      {/* Registration Status */}
      <div className="mb-8 p-6 bg-green-50 border border-green-200 rounded-lg">
        <div className="flex items-center justify-center mb-4">
          <div className="w-3 h-3 bg-green-400 rounded-full mr-2"></div>
          <span className="text-green-800 font-medium">Verified Maker</span>
        </div>
        <p className="text-green-700 mb-6">You are successfully registered as a maker!</p>
        
        <Link
          href="/maker-dashboard"
          className="inline-flex items-center bg-blue-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-blue-700 transition-colors"
        >
          Access Full Maker Dashboard
          <svg className="w-4 h-4 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </Link>
      </div>

      <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <p className="text-blue-800 text-sm">
          The full maker dashboard includes order creation with real blockchain transactions, 
          token approval workflows, and order management features.
        </p>
      </div>
    </div>
  );
}