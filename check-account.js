const { createPublicClient, http, formatEther } = require('viem');
const { base } = require('viem/chains');
const { privateKeyToAccount } = require('viem/accounts');

const makerAccount = privateKeyToAccount('0x742d35cc6634c0532925a3b8d16f2af11b2df73b2456ef83d8afeb9b3216f001');

const publicClient = createPublicClient({
  chain: base,
  transport: http('https://mainnet.base.org')
});

async function checkAccountAndContract() {
  try {
    console.log('🔍 Checking account status...');
    console.log('Account address:', makerAccount.address);
    
    // Check ETH balance
    const balance = await publicClient.getBalance({
      address: makerAccount.address
    });
    console.log('ETH balance:', formatEther(balance), 'ETH');
    
    if (balance === 0n) {
      console.log('❌ Account has no ETH for gas fees!');
      console.log('💡 Need to fund this account with ETH first');
      return;
    }
    
    // Check USDC balance
    const usdcAbi = [
      {
        inputs: [{ internalType: 'address', name: 'account', type: 'address' }],
        name: 'balanceOf',
        outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
        stateMutability: 'view',
        type: 'function'
      },
      {
        inputs: [
          { internalType: 'address', name: 'spender', type: 'address' },
          { internalType: 'uint256', name: 'amount', type: 'uint256' }
        ],
        name: 'approve',
        outputs: [{ internalType: 'bool', name: '', type: 'bool' }],
        stateMutability: 'nonpayable',
        type: 'function'
      }
    ];
    
    const usdcBalance = await publicClient.readContract({
      address: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913', // USDC on Base
      abi: usdcAbi,
      functionName: 'balanceOf',
      args: [makerAccount.address]
    });
    
    console.log('USDC balance:', (Number(usdcBalance) / 1e6).toFixed(6), 'USDC');
    
    if (usdcBalance === 0n) {
      console.log('❌ Account has no USDC!');
      console.log('💡 Need USDC to create orders');
      return;
    }
    
    // Check if contract exists
    const contractCode = await publicClient.getBytecode({
      address: '0x37fd17F7C301C00d263E573A1bDE7aD588D983C5'
    });
    
    if (!contractCode || contractCode === '0x') {
      console.log('❌ Contract does not exist at this address!');
      return;
    }
    
    console.log('✅ Contract exists and has bytecode');
    
    // Let's try to read some basic contract state first
    console.log('🔍 Checking contract state...');
    
    // Try to call a simple view function if available
    const getOrderAbi = [
      {
        inputs: [{ internalType: 'bytes32', name: '_orderId', type: 'bytes32' }],
        name: 'getOrder',
        outputs: [
          {
            components: [
              { internalType: 'address', name: 'maker', type: 'address' },
              { internalType: 'address', name: 'taker', type: 'address' },
              { internalType: 'string', name: 'recipientUpiAddress', type: 'string' },
              { internalType: 'uint256', name: 'amount', type: 'uint256' },
              { internalType: 'address', name: 'token', type: 'address' },
              { internalType: 'uint256', name: 'startPrice', type: 'uint256' },
              { internalType: 'uint256', name: 'acceptedPrice', type: 'uint256' },
              { internalType: 'uint256', name: 'endPrice', type: 'uint256' },
              { internalType: 'uint256', name: 'startTime', type: 'uint256' },
              { internalType: 'uint256', name: 'acceptedTime', type: 'uint256' },
              { internalType: 'bool', name: 'accepted', type: 'bool' },
              { internalType: 'bool', name: 'fullfilled', type: 'bool' }
            ],
            internalType: 'struct OrderProtocol.Order',
            name: '',
            type: 'tuple'
          }
        ],
        stateMutability: 'view',
        type: 'function'
      }
    ];
    
    // Try to read a dummy order to test contract functionality
    try {
      const dummyOrder = await publicClient.readContract({
        address: '0x37fd17F7C301C00d263E573A1bDE7aD588D983C5',
        abi: getOrderAbi,
        functionName: 'getOrder',
        args: ['0x0000000000000000000000000000000000000000000000000000000000000001']
      });
      console.log('✅ Contract is readable');
    } catch (e) {
      console.log('Contract read test result:', e.shortMessage || e.message);
    }
    
    console.log('\n📊 Summary:');
    console.log('- Account:', makerAccount.address);
    console.log('- ETH balance:', formatEther(balance), 'ETH');
    console.log('- USDC balance:', (Number(usdcBalance) / 1e6).toFixed(6), 'USDC');
    console.log('- Contract exists:', contractCode ? '✅' : '❌');
    
    if (balance > 0n && usdcBalance > 0n) {
      console.log('✅ Account is ready to create orders!');
    } else {
      console.log('❌ Account needs funding before creating orders');
      console.log('💡 Get ETH and USDC from a faucet or bridge');
    }
    
  } catch (error) {
    console.error('❌ Error:', error.shortMessage || error.message);
  }
}

checkAccountAndContract();