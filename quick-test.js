const { createWalletClient, createPublicClient, http } = require('viem');
const { base } = require('viem/chains');
const { privateKeyToAccount } = require('viem/accounts');

const relayerAccount = privateKeyToAccount('0x3583002f0a88fa0aee3669ed0fb5df42d26b1fa8415c8dd52ebcbcd14a0aa897');

const walletClient = createWalletClient({
  account: relayerAccount,
  chain: base,
  transport: http('https://base-mainnet.g.alchemy.com/v2/WhI4CLoqy0ycLxPPoYwSx')
});

const publicClient = createPublicClient({
  chain: base,
  transport: http('https://base-mainnet.g.alchemy.com/v2/WhI4CLoqy0ycLxPPoYwSx')
});

async function checkAndFulfill() {
  try {
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
    
    const orderId = '0x3334567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef';
    
    const order = await publicClient.readContract({
      address: '0x37fd17F7C301C00d263E573A1bDE7aD588D983C5',
      abi: getOrderAbi,
      functionName: 'getOrder',
      args: [orderId]
    });
    
    console.log('Order Status:');
    console.log('- Accepted:', order.accepted);
    console.log('- Taker:', order.taker);
    console.log('- Accepted Price:', order.acceptedPrice.toString());
    console.log('- UPI Address:', order.recipientUpiAddress);
    console.log('- Fulfilled:', order.fullfilled);
    
    if (order.accepted && !order.fullfilled) {
      console.log('\n🎯 Fulfilling order...');
      
      const fulfillAbi = [
        {
          inputs: [
            { internalType: 'bytes32', name: '_orderId', type: 'bytes32' },
            { internalType: 'string', name: '_proof', type: 'string' }
          ],
          name: 'fullfillOrder',
          outputs: [],
          stateMutability: 'nonpayable',
          type: 'function'
        }
      ];
      
      const hash = await walletClient.writeContract({
        address: '0x37fd17F7C301C00d263E573A1bDE7aD588D983C5',
        abi: fulfillAbi,
        functionName: 'fullfillOrder',
        args: [orderId, 'pout_test_123456'],
        gas: 500000n
      });
      
      console.log('Fulfillment TX:', hash);
      const receipt = await publicClient.waitForTransactionReceipt({ hash });
      console.log('✅ ORDER FULFILLED! Block:', receipt.blockNumber.toString());
      console.log('🎉 Complete crypto-to-UPI flow successful!');
    } else if (order.fullfilled) {
      console.log('✅ Order already fulfilled!');
    }
    
  } catch (error) {
    console.error('Error:', error.shortMessage || error.message);
  }
}

checkAndFulfill();