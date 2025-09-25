const { createWalletClient, createPublicClient, http } = require('viem');
const { base } = require('viem/chains');
const { privateKeyToAccount } = require('viem/accounts');

const publicClient = createPublicClient({
  chain: base,
  transport: http('https://base-mainnet.g.alchemy.com/v2/WhI4CLoqy0ycLxPPoYwSx')
});

async function findRecentOrders() {
  try {
    console.log('🔍 Checking recent OrderCreated events...');
    
    const orderCreatedAbi = [
      {
        anonymous: false,
        inputs: [
          { indexed: true, internalType: 'bytes32', name: 'orderId', type: 'bytes32' },
          { indexed: true, internalType: 'address', name: 'maker', type: 'address' },
          { indexed: false, internalType: 'uint256', name: 'amount', type: 'uint256' },
          { indexed: false, internalType: 'address', name: 'token', type: 'address' },
          { indexed: false, internalType: 'string', name: 'recipientUpiAddress', type: 'string' }
        ],
        name: 'OrderCreated',
        type: 'event'
      }
    ];
    
    // Get recent OrderCreated events
    const logs = await publicClient.getLogs({
      address: '0x37fd17F7C301C00d263E573A1bDE7aD588D983C5',
      event: {
        type: 'event',
        name: 'OrderCreated',
        inputs: [
          { indexed: true, name: 'orderId', type: 'bytes32' },
          { indexed: true, name: 'maker', type: 'address' },
          { indexed: false, name: 'amount', type: 'uint256' },
          { indexed: false, name: 'token', type: 'address' },
          { indexed: false, name: 'recipientUpiAddress', type: 'string' }
        ]
      },
      fromBlock: 35993000n, // Around the block we created our order
      toBlock: 'latest'
    });
    
    console.log(`Found ${logs.length} recent orders:`);
    
    for (let i = 0; i < logs.length; i++) {
      const log = logs[i];
      console.log(`\nOrder ${i + 1}:`);
      console.log('- Order ID:', log.args.orderId);
      console.log('- Maker:', log.args.maker); 
      console.log('- Amount:', log.args.amount.toString());
      console.log('- Token:', log.args.token);
      console.log('- UPI:', log.args.recipientUpiAddress);
      console.log('- Block:', log.blockNumber.toString());
      console.log('- TX Hash:', log.transactionHash);
      
      // Check if it's from our expected maker address
      if (log.args.maker === '0x8fF8dE5dF1d0e66D8c6A9FdD4db7A5b01F4D7E3C') {
        console.log('🎯 This is OUR order!');
        
        // Now check its current status
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
          args: [log.args.orderId]
        });
        
        console.log('\nCurrent Status:');
        console.log('- Accepted:', order.accepted);
        console.log('- Fulfilled:', order.fullfilled);
        console.log('- Taker:', order.taker);
        console.log('- Accepted Price:', order.acceptedPrice.toString());
      }
    }
    
  } catch (error) {
    console.error('Error:', error.shortMessage || error.message);
  }
}

findRecentOrders();