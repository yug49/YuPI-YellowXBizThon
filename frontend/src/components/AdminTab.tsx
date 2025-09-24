"use client";

import { useState, useEffect } from 'react';
import { useAccount } from 'wagmi';
import { useAdminOperations, useMakerDetails, useResolverStatus } from '@/lib/useContracts';
import { useErrorHandler } from '@/lib/useErrorHandler';
import { useDebounce } from '@/lib/useDebounce';
import { isAddress } from 'viem';

export default function AdminTab() {
  const { address: connectedAddress, isConnected } = useAccount();
  const [activeSection, setActiveSection] = useState('register-maker');
  
  // Register Maker Form State
  const [makerForm, setMakerForm] = useState({
    address: '',
    isIndian: true,
    identityProof: ''
  });

  // Register Resolver Form State
  const [resolverForm, setResolverForm] = useState({
    address: ''
  });

  // Token Management Form State
  const [tokenForm, setTokenForm] = useState({
    address: ''
  });

  // Search Forms State
  const [searchMakerAddress, setSearchMakerAddress] = useState('');
  const [searchResolverAddress, setSearchResolverAddress] = useState('');
  const [editingMakerProof, setEditingMakerProof] = useState('');
  const [isEditingProof, setIsEditingProof] = useState(false);

  // Error handling
  const { error, isShowingError, handleError, clearError } = useErrorHandler();

  // Contract hooks
  const {
    registerMaker,
    editMaker,
    deleteMaker,
    addResolver,
    removeResolver,
    addToken,
    removeToken,
    isPending,
    error: contractError,
    isSuccess,
    reset
  } = useAdminOperations();

  // Data hooks for searched addresses - use debounced values to reduce RPC calls
  const debouncedMakerAddress = useDebounce(searchMakerAddress, 800); // 800ms delay
  const debouncedResolverAddress = useDebounce(searchResolverAddress, 800);
  
  const makerDetails = useMakerDetails(debouncedMakerAddress);
  const resolverStatus = useResolverStatus(debouncedResolverAddress);

  // Handle contract errors
  useEffect(() => {
    if (contractError) {
      handleError(contractError);
    }
  }, [contractError, handleError]);

  // Handle success
  useEffect(() => {
    if (isSuccess) {
      clearError();
      // Reset contract state for next operation
      setTimeout(() => reset(), 1000);
    }
  }, [isSuccess, clearError, reset]);

  const handleMakerInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    setMakerForm(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
    clearError(); // Clear errors when user starts typing
  };

  const handleResolverInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setResolverForm(prev => ({
      ...prev,
      [name]: value
    }));
    clearError(); // Clear errors when user starts typing
  };

  const handleTokenInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setTokenForm(prev => ({
      ...prev,
      [name]: value
    }));
    clearError(); // Clear errors when user starts typing
  };

  const handleRegisterMaker = async () => {
    clearError();
    
    if (!makerForm.address || !makerForm.identityProof) {
      handleError({ message: 'Please fill all fields', type: 'error' });
      return;
    }
    
    if (!isAddress(makerForm.address)) {
      handleError({ message: 'Invalid wallet address format', type: 'error' });
      return;
    }

    try {
      await registerMaker(
        makerForm.address,
        makerForm.identityProof,
        !makerForm.isIndian // isForeigner is opposite of isIndian
      );
      
      setMakerForm({ address: '', isIndian: true, identityProof: '' });
    } catch (err: unknown) {
      handleError(err as Error);
    }
  };

  const handleRegisterResolver = async () => {
    clearError();
    
    if (!resolverForm.address) {
      handleError({ message: 'Please enter resolver address', type: 'error' });
      return;
    }
    
    if (!isAddress(resolverForm.address)) {
      handleError({ message: 'Invalid wallet address format', type: 'error' });
      return;
    }

    try {
      await addResolver(resolverForm.address);
      setResolverForm({ address: '' });
    } catch (err: unknown) {
      handleError(err as Error);
    }
  };

  const handleEditMaker = async () => {
    clearError();
    
    if (!editingMakerProof.trim()) {
      handleError({ message: 'Please enter new proof', type: 'error' });
      return;
    }

    try {
      await editMaker(searchMakerAddress, editingMakerProof);
      setEditingMakerProof('');
      setIsEditingProof(false);
    } catch (err: unknown) {
      handleError(err as Error);
    }
  };

  const handleDeleteMaker = async () => {
    if (!confirm('Are you sure you want to delete this maker?')) return;
    
    clearError();
    try {
      await deleteMaker(searchMakerAddress);
    } catch (err: unknown) {
      handleError(err as Error);
    }
  };

  const handleDeleteResolver = async () => {
    if (!confirm('Are you sure you want to remove this resolver?')) return;
    
    clearError();
    try {
      await removeResolver(searchResolverAddress);
    } catch (err: unknown) {
      handleError(err as Error);
    }
  };

  const handleAddToken = async () => {
    clearError();
    
    if (!tokenForm.address) {
      handleError({ message: 'Please enter token address', type: 'error' });
      return;
    }
    
    if (!isAddress(tokenForm.address)) {
      handleError({ message: 'Invalid token address format', type: 'error' });
      return;
    }

    try {
      await addToken(tokenForm.address);
      setTokenForm({ address: '' });
    } catch (err: unknown) {
      handleError(err as Error);
    }
  };

  const handleRemoveToken = async () => {
    clearError();
    
    if (!tokenForm.address) {
      handleError({ message: 'Please enter token address', type: 'error' });
      return;
    }
    
    if (!isAddress(tokenForm.address)) {
      handleError({ message: 'Invalid token address format', type: 'error' });
      return;
    }

    if (!confirm('Are you sure you want to remove this token from supported tokens?')) return;

    try {
      await removeToken(tokenForm.address);
      setTokenForm({ address: '' });
    } catch (err: unknown) {
      handleError(err as Error);
    }
  };

  const sections = [
    { id: 'register-maker', label: 'Register Maker' },
    { id: 'manage-makers', label: 'Manage Makers' },
    { id: 'register-resolver', label: 'Register Resolver' },
    { id: 'manage-resolvers', label: 'Manage Resolvers' },
    { id: 'manage-tokens', label: 'Manage Tokens' }
  ];

  if (!isConnected) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500 text-lg">Please connect your wallet to access admin functions</p>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto">
      <h2 className="text-2xl font-bold mb-6 text-gray-800">Admin Dashboard</h2>
      
      {/* Connected Address Display */}
      <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <p className="text-sm text-blue-700">
          <strong>Connected as Admin:</strong> {connectedAddress}
        </p>
      </div>

      {/* Transaction Status */}
      {isPending && (
        <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
          <div className="flex items-center">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-yellow-600 mr-2"></div>
            <p className="text-yellow-700">Transaction pending...</p>
          </div>
        </div>
      )}
      
      {/* Enhanced Error Display */}
      {isShowingError && error && (
        <div className={`mb-6 p-4 border rounded-lg ${
          error.type === 'error' ? 'bg-red-50 border-red-200' :
          error.type === 'warning' ? 'bg-yellow-50 border-yellow-200' :
          'bg-blue-50 border-blue-200'
        }`}>
          <div className="flex items-start justify-between">
            <div className="flex items-start">
              <div className={`mr-2 mt-0.5 ${
                error.type === 'error' ? 'text-red-500' :
                error.type === 'warning' ? 'text-yellow-500' :
                'text-blue-500'
              }`}>
                {error.type === 'error' ? '⚠️' : error.type === 'warning' ? '⏳' : 'ℹ️'}
              </div>
              <div>
                <p className={`${
                  error.type === 'error' ? 'text-red-700' :
                  error.type === 'warning' ? 'text-yellow-700' :
                  'text-blue-700'
                }`}>
                  {error.message}
                </p>
                {error.isRateLimit && (
                  <p className="text-sm text-gray-600 mt-1">
                    This usually resolves in 30-60 seconds. You can also try switching to a different RPC endpoint.
                  </p>
                )}
              </div>
            </div>
            <button 
              onClick={clearError}
              className={`ml-2 ${
                error.type === 'error' ? 'text-red-400 hover:text-red-600' :
                error.type === 'warning' ? 'text-yellow-400 hover:text-yellow-600' :
                'text-blue-400 hover:text-blue-600'
              }`}
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {isSuccess && (
        <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
          <div className="flex items-center">
            <span className="text-green-500 mr-2">✅</span>
            <p className="text-green-700">Transaction successful!</p>
          </div>
        </div>
      )}
      
      {/* Section Navigation */}
      <div className="flex flex-wrap gap-2 mb-6 p-1 bg-gray-100 rounded-lg">
        {sections.map((section) => (
          <button
            key={section.id}
            onClick={() => setActiveSection(section.id)}
            className={`px-4 py-2 rounded-md font-medium transition-colors ${
              activeSection === section.id
                ? 'bg-white text-blue-600 shadow-sm'
                : 'text-gray-600 hover:text-gray-800'
            }`}
          >
            {section.label}
          </button>
        ))}
      </div>

      {/* Register Maker Section */}
      {activeSection === 'register-maker' && (
        <div className="max-w-2xl">
          <h3 className="text-lg font-semibold mb-4 text-gray-700">Register New Maker</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Wallet Address
              </label>
              <input
                type="text"
                name="address"
                value={makerForm.address}
                onChange={handleMakerInputChange}
                placeholder="Enter wallet address"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              {makerForm.address && !isAddress(makerForm.address) && (
                <p className="text-red-500 text-sm mt-1">Invalid address format</p>
              )}
            </div>

            <div>
              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  name="isIndian"
                  checked={makerForm.isIndian}
                  onChange={handleMakerInputChange}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-sm font-medium text-gray-700">Is Indian Resident</span>
              </label>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {makerForm.isIndian ? 'UPI ID' : 'Passport Number'}
              </label>
              <input
                type="text"
                name="identityProof"
                value={makerForm.identityProof}
                onChange={handleMakerInputChange}
                placeholder={makerForm.isIndian ? 'Enter UPI ID' : 'Enter Passport Number'}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <button
              onClick={handleRegisterMaker}
              disabled={isPending || !isAddress(makerForm.address) || !makerForm.identityProof}
              className="w-full bg-blue-500 text-white py-2 rounded-lg font-medium hover:bg-blue-600 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed"
            >
              {isPending ? 'Registering...' : 'Register Maker'}
            </button>
          </div>
        </div>
      )}

      {/* Manage Makers Section */}
      {activeSection === 'manage-makers' && (
        <div>
          <h3 className="text-lg font-semibold mb-4 text-gray-700">Search & Manage Makers</h3>
          
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Maker Address
            </label>
            <input
              type="text"
              value={searchMakerAddress}
              onChange={(e) => setSearchMakerAddress(e.target.value)}
              placeholder="Enter maker address to search"
              className="w-full max-w-md px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {searchMakerAddress && isAddress(searchMakerAddress) && (
            <div className="border border-gray-200 rounded-lg p-6">
              <h4 className="text-lg font-medium mb-4">Maker Details</h4>
              
              {makerDetails.isRegistered ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-gray-600">Status</p>
                      <p className="font-medium text-green-600">Registered</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Type</p>
                      <p className="font-medium">{makerDetails.isForeigner ? 'Non-Indian' : 'Indian'}</p>
                    </div>
                    <div className="md:col-span-2">
                      <p className="text-sm text-gray-600">
                        {makerDetails.isForeigner ? 'Passport Number' : 'UPI ID'}
                      </p>
                      <p className="font-medium">{makerDetails.identityProof || 'No proof found'}</p>
                    </div>
                  </div>

                  <div className="border-t pt-4">
                    <h5 className="font-medium mb-3">Edit Maker</h5>
                    {!isEditingProof ? (
                      <button
                        onClick={() => {
                          setIsEditingProof(true);
                          setEditingMakerProof(makerDetails.identityProof || '');
                        }}
                        className="bg-yellow-500 text-white px-4 py-2 rounded-lg hover:bg-yellow-600 transition-colors mr-2"
                      >
                        Edit Proof
                      </button>
                    ) : (
                      <div className="space-y-3">
                        <input
                          type="text"
                          value={editingMakerProof}
                          onChange={(e) => setEditingMakerProof(e.target.value)}
                          placeholder="Enter new proof"
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                        <div className="flex space-x-2">
                          <button
                            onClick={handleEditMaker}
                            disabled={isPending}
                            className="bg-green-500 text-white px-4 py-2 rounded-lg hover:bg-green-600 transition-colors disabled:bg-gray-300"
                          >
                            {isPending ? 'Saving...' : 'Save'}
                          </button>
                          <button
                            onClick={() => {
                              setIsEditingProof(false);
                              setEditingMakerProof('');
                            }}
                            className="bg-gray-500 text-white px-4 py-2 rounded-lg hover:bg-gray-600 transition-colors"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    )}
                    
                    <button
                      onClick={handleDeleteMaker}
                      disabled={isPending}
                      className="bg-red-500 text-white px-4 py-2 rounded-lg hover:bg-red-600 transition-colors ml-2 disabled:bg-gray-300"
                    >
                      {isPending ? 'Deleting...' : 'Delete Maker'}
                    </button>
                  </div>
                </div>
              ) : (
                <p className="text-gray-500">No maker found with this address</p>
              )}
            </div>
          )}

          {searchMakerAddress && !isAddress(searchMakerAddress) && (
            <p className="text-red-500 text-sm">Invalid address format</p>
          )}
        </div>
      )}

      {/* Register Resolver Section */}
      {activeSection === 'register-resolver' && (
        <div className="max-w-2xl">
          <h3 className="text-lg font-semibold mb-4 text-gray-700">Register New Resolver</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Wallet Address
              </label>
              <input
                type="text"
                name="address"
                value={resolverForm.address}
                onChange={handleResolverInputChange}
                placeholder="Enter resolver wallet address"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              {resolverForm.address && !isAddress(resolverForm.address) && (
                <p className="text-red-500 text-sm mt-1">Invalid address format</p>
              )}
            </div>

            <button
              onClick={handleRegisterResolver}
              disabled={isPending || !isAddress(resolverForm.address)}
              className="w-full bg-green-500 text-white py-2 rounded-lg font-medium hover:bg-green-600 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed"
            >
              {isPending ? 'Registering...' : 'Register Resolver'}
            </button>
          </div>
        </div>
      )}

      {/* Manage Resolvers Section */}
      {activeSection === 'manage-resolvers' && (
        <div>
          <h3 className="text-lg font-semibold mb-4 text-gray-700">Search & Manage Resolvers</h3>
          
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Resolver Address
            </label>
            <input
              type="text"
              value={searchResolverAddress}
              onChange={(e) => setSearchResolverAddress(e.target.value)}
              placeholder="Enter resolver address to search"
              className="w-full max-w-md px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {searchResolverAddress && isAddress(searchResolverAddress) && (
            <div className="border border-gray-200 rounded-lg p-6">
              <h4 className="text-lg font-medium mb-4">Resolver Status</h4>
              
              <div className="space-y-4">
                <div>
                  <p className="text-sm text-gray-600">Registration Status</p>
                  <p className={`font-medium ${resolverStatus.isResolver ? 'text-green-600' : 'text-red-600'}`}>
                    {resolverStatus.isResolver ? 'Registered' : 'Not Registered'}
                  </p>
                </div>

                {resolverStatus.isResolver && (
                  <div className="border-t pt-4">
                    <button
                      onClick={handleDeleteResolver}
                      disabled={isPending}
                      className="bg-red-500 text-white px-4 py-2 rounded-lg hover:bg-red-600 transition-colors disabled:bg-gray-300"
                    >
                      {isPending ? 'Removing...' : 'Remove Resolver'}
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

          {searchResolverAddress && !isAddress(searchResolverAddress) && (
            <p className="text-red-500 text-sm">Invalid address format</p>
          )}
        </div>
      )}

      {/* Manage Tokens Section */}
      {activeSection === 'manage-tokens' && (
        <div className="max-w-2xl">
          <h3 className="text-lg font-semibold mb-4 text-gray-700">Manage Supported Tokens</h3>
          
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Token Contract Address
              </label>
              <input
                type="text"
                name="address"
                value={tokenForm.address}
                onChange={handleTokenInputChange}
                placeholder="Enter token contract address"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              {tokenForm.address && !isAddress(tokenForm.address) && (
                <p className="text-red-500 text-sm mt-1">Invalid address format</p>
              )}
            </div>

            <div className="flex gap-4">
              <button
                onClick={handleAddToken}
                disabled={isPending || !tokenForm.address || !isAddress(tokenForm.address)}
                className="bg-green-500 text-white px-6 py-2 rounded-lg hover:bg-green-600 transition-colors disabled:bg-gray-300"
              >
                {isPending ? 'Adding...' : 'Add Token'}
              </button>
              
              <button
                onClick={handleRemoveToken}
                disabled={isPending || !tokenForm.address || !isAddress(tokenForm.address)}
                className="bg-red-500 text-white px-6 py-2 rounded-lg hover:bg-red-600 transition-colors disabled:bg-gray-300"
              >
                {isPending ? 'Removing...' : 'Remove Token'}
              </button>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h4 className="font-medium text-blue-800 mb-2">Quick Add - Known Tokens</h4>
              <p className="text-sm text-blue-700 mb-3">MockUSDC (for testing): 0x32B9dB3C79340317b5F9A33eD2c599e63380283C</p>
              <button
                onClick={() => setTokenForm({ address: '0x32B9dB3C79340317b5F9A33eD2c599e63380283C' })}
                className="text-blue-600 hover:text-blue-800 text-sm font-medium"
              >
                Fill MockUSDC Address
              </button>
            </div>

            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
              <h4 className="font-medium text-gray-800 mb-2">Instructions</h4>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>• <strong>Add Token:</strong> Makes the token available for order creation</li>
                <li>• <strong>Remove Token:</strong> Prevents new orders with this token (existing orders unaffected)</li>
                <li>• Only contract owner can manage supported tokens</li>
                <li>• Users must approve tokens before creating orders</li>
              </ul>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}