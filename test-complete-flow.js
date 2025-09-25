const { createWalletClient, createPublicClient, http } = require('viem');
const { base } = require('viem/chains');
const { privateKeyToAccount } = require('viem/accounts');

// Maker account (creating order)
const makerAccount = privateKeyToAccount('0x742d35cc6634c0532925a3b8d16f2af11b2df73b2456ef83d8afeb9b3216f001');

const walletClient = createWalletClient({
  account: makerAccount,
  chain: base,
  transport: http('https://base-mainnet.g.alchemy.com/v2/WhI4CLoqy0ycLxPPoYwSx-o6f2Y2YaAINRfRJj5-FIj')
});

const publicClient = createPublicClient({
  chain: base,
  transport: http('https://base-mainnet.g.alchemy.com/v2/WhI4CLoqy0ycLxPPoYwSx-o6f2Y2YaAINRfRJj5-FIj')
});

async function createNewOrder() {
  try {
    console.log('🚀 Creating new blockchain order...');
    
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
    
    // Create order with current timestamp to ensure uniqueness
    const timestamp = Math.floor(Date.now() / 1000);
    const upiAddress = `testorder${timestamp}@paytm`;
    
    const hash = await walletClient.writeContract({
      address: '0x37fd17F7C301C00d263E573A1bDE7aD588D983C5',
      abi: createOrderAbi,
      functionName: 'createOrder',
      args: [
        upiAddress,
        1000000n, // 1 USDC (6 decimals)
        '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913', // USDC on Base
        90000000n, // ₹90.00 start price
        88000000n, // ₹88.00 end price  
        300n // 5 minutes auction
      ],
      gas: 500000n
    });
    
    console.log('Transaction hash:', hash);
    console.log('Waiting for confirmation...');
    
    const receipt = await publicClient.waitForTransactionReceipt({ hash });
    console.log('✅ Order created at block:', receipt.blockNumber.toString());
    
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
      
      // Wait a bit and check if resolver bot picked it up
      console.log('\n⏳ Waiting 10 seconds for resolver bot to process...');
      await new Promise(resolve => setTimeout(resolve, 10000));
      
      // Check order status
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
      
      const order = await publicClient.readContract({
        address: '0x37fd17F7C301C00d263E573A1bDE7aD588D983C5',
        abi: getOrderAbi,
        functionName: 'getOrder',
        args: [orderId]
      });
      
      console.log('\n📊 Final Order Status:');
      console.log('- Order ID:', orderId);
      console.log('- Maker:', order.maker);
      console.log('- Amount:', order.amount.toString());
      console.log('- UPI Address:', order.recipientUpiAddress);
      console.log('- Accepted:', order.accepted);
      console.log('- Taker:', order.taker);
      console.log('- Accepted Price:', order.acceptedPrice.toString());
      console.log('- Fulfilled:', order.fullfilled);
      
      if (order.accepted) {
        console.log('🎉 SUCCESS: Resolver bot automatically accepted the order!');
        if (order.fullfilled) {
          console.log('🎉 COMPLETE: Order is fully fulfilled!');
        } else {
          console.log('⏳ Order accepted, waiting for fulfillment...');
        }
      } else {
        console.log('⏳ Order created, waiting for resolver bot to accept...');
      }
    }
    
  } catch (error) {
    console.error('Error:', error.shortMessage || error.message);
  }
}

createNewOrder();