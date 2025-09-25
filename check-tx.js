const { createPublicClient, http } = require('viem');
const { base } = require('viem/chains');

const publicClient = createPublicClient({
  chain: base,
  transport: http('https://base-mainnet.g.alchemy.com/v2/WhI4CLoqy0ycLxPPoYwSx-o6f2Y2YaAINRfRJj5-FIj')
});

async function checkTransaction() {
  try {
    // Check our order creation transaction
    const createTxHash = '0x5198a085b9e4f2536b71d20e2e21a4a0c542a22c69f5d9c7aa3dbaeca8cb5e3';
    
    console.log('🔍 Checking order creation transaction...');
    const receipt = await publicClient.getTransactionReceipt({ 
      hash: createTxHash 
    });
    
    console.log('Transaction status:', receipt.status);
    console.log('Block number:', receipt.blockNumber.toString());
    console.log('Gas used:', receipt.gasUsed.toString());
    
    // Look for OrderCreated event in logs
    console.log('\nLooking for OrderCreated event:');
    for (const log of receipt.logs) {
      if (log.address.toLowerCase() === '0x37fd17F7C301C00d263E573A1bDE7aD588D983C5'.toLowerCase()) {
        console.log('Found contract log:');
        console.log('- Topics:', log.topics);
        console.log('- Data:', log.data);
        
        // First topic is event signature, second is orderId
        if (log.topics.length > 1) {
          const orderId = log.topics[1];
          console.log('🎯 Order ID:', orderId);
          
          // Now check this order's status
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
          
          console.log('\n📊 Order Status:');
          console.log('- Maker:', order.maker);
          console.log('- Amount:', order.amount.toString());
          console.log('- Token:', order.token);
          console.log('- UPI Address:', order.recipientUpiAddress);
          console.log('- Accepted:', order.accepted);
          console.log('- Taker:', order.taker);
          console.log('- Accepted Price:', order.acceptedPrice.toString());
          console.log('- Fulfilled:', order.fullfilled);
          
          return orderId;
        }
      }
    }
    
  } catch (error) {
    console.error('Error:', error.shortMessage || error.message);
  }
}

checkTransaction();