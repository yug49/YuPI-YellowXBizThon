const { createWalletClient, createPublicClient, http, parseGwei } = require('viem');
const { base } = require('viem/chains');
const { privateKeyToAccount } = require('viem/accounts');

// Use proper test account with valid private key
const makerAccount = privateKeyToAccount('0x742d35cc6634c0532925a3b8d16f2af11b2df73b2456ef83d8afeb9b3216f001');

const publicClient = createPublicClient({
  chain: base,
  transport: http('https://mainnet.base.org')
});

const walletClient = createWalletClient({
  account: makerAccount,
  chain: base,
  transport: http('https://mainnet.base.org')
});

async function createOrderWithProperGas() {
  try {
    console.log('🚀 Creating order with proper gas settings...');
    console.log('Maker address:', makerAccount.address);
    
    // Get current gas price for Base
    const gasPrice = await publicClient.getGasPrice();
    console.log('Current gas price:', gasPrice.toString(), 'wei');
    
    // Get current block to ensure we're connected
    const block = await publicClient.getBlockNumber();
    console.log('Current block:', block.toString());
    
    const createOrderAbi = [
      {
        inputs: [
          { internalType: 'string', name: '_recipientUpiAddress', type: 'string' },
          { internalType: 'uint256', name: '_amount', type: 'uint256' },
          { internalType: 'address', name: '_token', type: 'address' },
          { internalType: 'uint256', name: '_startPrice', type: 'uint256' },
          { internalType: 'uint256', name: '_endPrice', type: 'uint256' },
          { internalType: 'uint256', name: '_auctionDuration', type: 'uint256' }
        ],
        name: 'createOrder',
        outputs: [{ internalType: 'bytes32', name: '', type: 'bytes32' }],
        stateMutability: 'nonpayable',
        type: 'function'
      }
    ];
    
    // Create unique UPI address for this test
    const timestamp = Math.floor(Date.now() / 1000);
    const upiAddress = `testorder${timestamp}@paytm`;
    
    console.log('📱 UPI Address:', upiAddress);
    
    // First estimate gas
    console.log('⛽ Estimating gas...');
    const gasEstimate = await publicClient.estimateContractGas({
      address: '0x37fd17F7C301C00d263E573A1bDE7aD588D983C5',
      abi: createOrderAbi,
      functionName: 'createOrder',
      args: [
        upiAddress,
        1000000n, // 1 USDC (6 decimals)
        '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913', // USDC on Base
        90000000n, // ₹90.00 start price (8 decimals for INR)
        88000000n, // ₹88.00 end price
        300n // 5 minutes auction
      ],
      account: makerAccount.address
    });
    
    console.log('Gas estimate:', gasEstimate.toString());
    
    // Add 20% buffer to gas estimate
    const gasLimit = (gasEstimate * 120n) / 100n;
    console.log('Gas limit with buffer:', gasLimit.toString());
    
    // Use higher gas price for faster confirmation (Base typically needs higher gas)
    const gasPrice2x = (gasPrice * 120n) / 100n; // 20% higher than current
    console.log('Using gas price:', gasPrice2x.toString());
    
    console.log('📝 Submitting transaction...');
    const hash = await walletClient.writeContract({
      address: '0x37fd17F7C301C00d263E573A1bDE7aD588D983C5',
      abi: createOrderAbi,
      functionName: 'createOrder',
      args: [
        upiAddress,
        1000000n, // 1 USDC
        '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913', // USDC on Base
        90000000n, // ₹90.00 start
        88000000n, // ₹88.00 end
        300n // 5 minutes
      ],
      gas: gasLimit,
      gasPrice: gasPrice2x
    });
    
    console.log('✅ Transaction submitted!');
    console.log('🔗 Transaction hash:', hash);
    console.log('⏳ Waiting for confirmation...');
    
    const receipt = await publicClient.waitForTransactionReceipt({ 
      hash,
      timeout: 60000 // 60 second timeout
    });
    
    console.log('🎉 Transaction confirmed!');
    console.log('📦 Block number:', receipt.blockNumber.toString());
    console.log('⛽ Gas used:', receipt.gasUsed.toString());
    console.log('💰 Effective gas price:', receipt.effectiveGasPrice.toString());
    
    // Extract order ID from logs
    let orderId = null;
    for (const log of receipt.logs) {
      if (log.address.toLowerCase() === '0x37fd17F7C301C00d263E573A1bDE7aD588D983C5'.toLowerCase()) {
        if (log.topics.length > 1) {
          orderId = log.topics[1];
          break;
        }
      }
    }
    
    if (orderId) {
      console.log('🎯 Order ID:', orderId);
      console.log('📱 UPI Address:', upiAddress);
      console.log('✅ Order successfully created on blockchain!');
      console.log('🤖 Resolver bot should now detect and process this order');
    }
    
  } catch (error) {
    console.error('❌ Error:', error.shortMessage || error.message);
    if (error.cause) {
      console.error('Cause:', error.cause);
    }
    if (error.details) {
      console.error('Details:', error.details);
    }
  }
}

createOrderWithProperGas();