// Test Yellow Network authentication directly
const { 
  createAuthRequestMessage,
  parseAnyRPCResponse,
  RPCMethod 
} = require('@erc7824/nitrolite');
const { ethers } = require('ethers');
const WebSocket = require('ws');
require('dotenv').config();

async function testYellowAuth() {
  console.log('🧪 Testing Yellow Network authentication...');
  
  // Create test wallet
  const wallet = new ethers.Wallet(process.env.RELAYER_PRIVATE_KEY);
  console.log('💼 Wallet address:', wallet.address);
  
  // Test different parameter combinations
  const testCases = [
    {
      name: 'Current format',
      params: {
        wallet: wallet.address,
        participant: wallet.address,
        app_name: 'CryptoUPI',
        expire: Math.floor(Date.now() / 1000) + 3600,
        scope: 'console',
        application: process.env.CONTRACT_ADDRESS,
        allowances: []
      }
    },
    {
      name: 'Without application',
      params: {
        wallet: wallet.address,
        participant: wallet.address,
        app_name: 'CryptoUPI',
        expire: Math.floor(Date.now() / 1000) + 3600,
        scope: 'console',
        allowances: []
      }
    },
    {
      name: 'Minimal format',
      params: {
        wallet: wallet.address,
        participant: wallet.address,
        app_name: 'CryptoUPI',
        expire: Math.floor(Date.now() / 1000) + 3600,
        scope: 'console'
      }
    }
  ];
  
  for (const testCase of testCases) {
    try {
      console.log(`\n🔍 Testing ${testCase.name}:`);
      console.log('Parameters:', JSON.stringify(testCase.params, null, 2));
      
      const authRequest = await createAuthRequestMessage(testCase.params);
      console.log('✅ Auth request created successfully');
      console.log('Message:', authRequest.substring(0, 200) + '...');
      
      // Test WebSocket connection
      const ws = new WebSocket('wss://clearnet.yellow.com/ws');
      
      await new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          ws.close();
          reject(new Error('Connection timeout'));
        }, 10000);
        
        ws.onopen = () => {
          console.log('🌐 WebSocket connected');
          ws.send(authRequest);
        };
        
        ws.onmessage = (event) => {
          clearTimeout(timeout);
          const message = parseAnyRPCResponse(event.data);
          console.log('📨 Response:', message.method);
          
          if (message.method === 'error') {
            console.log('❌ Error details:', message.params || message);
          } else {
            console.log('✅ Success! Message type:', message.method);
          }
          
          ws.close();
          resolve();
        };
        
        ws.onerror = (error) => {
          clearTimeout(timeout);
          console.log('❌ WebSocket error:', error.message);
          reject(error);
        };
      });
      
      break; // If successful, no need to test other cases
      
    } catch (error) {
      console.log('❌ Test case failed:', error.message);
    }
  }
}

testYellowAuth().catch(console.error);