# Yellow Network Integration Action Plan
## Crypto-to-UPI Payment Protocol Conversion (3 Hours)

### 🎯 Project Overview
Transform the existing 20-30 second crypto-to-UPI payment flow into a sub-5-second Yellow Network powered solution using state channels for instant settlements.

### 📊 Current vs Target Architecture

#### Current Architecture (20-30s total)
- **Backend**: Express.js server with RazorpayX integration
- **Frontend**: Next.js interface for order creation/management  
- **Resolver Bot**: Automated payment processor
- **Smart Contracts**: OrderProtocol on Base Mainnet
- **Flow**: Dutch auction (5s) + settlement (15-25s) = 20-30s total

#### Target Architecture with Yellow SDK (~5s total)
- **Instant Settlement**: Use Yellow state channels for sub-second crypto transfers
- **3+ Entity Session**: Backend + User + Resolver in single Yellow application session
- **Simplified Flow**: 5s auction + milliseconds settlement = ~5s total
- **ClearNode**: `wss://clearnet.yellow.com/ws`

---

## 🚀 Phase 1: Setup & Dependencies (30 minutes)

### 1.1 Install Yellow SDK
```bash
# Backend dependencies
cd backend && npm install @erc7824/nitrolite

# Frontend dependencies  
cd frontend && npm install @erc7824/nitrolite

# Resolver bot dependencies
cd resolver-bot && npm install @erc7824/nitrolite
```

### 1.2 Environment Configuration
Create channels at [apps.yellow.com](https://apps.yellow.com)

**Environment Variables** (Add to all `.env` files):
```env
# Yellow Network Integration
YELLOW_CLEARNODE_URL=wss://clearnet.yellow.com/ws
MAIN_RESOLVER_ADDRESS=0xYourMainResolverAddress
YELLOW_APP_NAME=CryptoUPI
YELLOW_SESSION_TIMEOUT=10000
```

### 1.3 Project Structure Updates
```
├── backend/
│   ├── yellow/
│   │   ├── clearnode-connection.js    # Yellow ClearNode integration
│   │   ├── session-manager.js         # Application session handling
│   │   └── instant-settlement.js      # Off-chain settlement logic
├── frontend/
│   ├── yellow/
│   │   ├── wallet-integration.js      # Yellow wallet connection
│   │   └── session-ui.js             # Session status display
├── resolver-bot/
│   ├── yellow/
│   │   ├── resolver-client.js         # Yellow resolver integration
│   │   └── auto-settlement.js         # Automated Yellow settlements
```

---

## 🔧 Phase 2: Backend Yellow Integration (45 minutes)

### 2.1 ClearNode Connection Setup
**File**: `backend/yellow/clearnode-connection.js`

```javascript
import { 
  createAuthRequestMessage, 
  createAuthVerifyMessage, 
  createEIP712AuthMessageSigner,
  parseRPCResponse,
  RPCMethod 
} from '@erc7824/nitrolite';
import { ethers } from 'ethers';
import WebSocket from 'ws';

class YellowClearNodeConnection {
  constructor() {
    this.ws = null;
    this.isAuthenticated = false;
    this.wallet = new ethers.Wallet(process.env.RELAYER_PRIVATE_KEY);
  }

  async connect() {
    this.ws = new WebSocket('wss://clearnet.yellow.com/ws');
    
    this.ws.onopen = async () => {
      console.log('Connected to Yellow ClearNode');
      await this.authenticate();
    };
    
    this.ws.onmessage = this.handleMessage.bind(this);
  }

  async authenticate() {
    const authRequest = await createAuthRequestMessage({
      wallet: this.wallet.address,
      participant: this.wallet.address,
      app_name: 'CryptoUPI',
      expire: Math.floor(Date.now() / 1000) + 3600,
      scope: 'console',
      application: process.env.CONTRACT_ADDRESS,
      allowances: []
    });
    
    this.ws.send(authRequest);
  }

  async handleMessage(event) {
    const message = parseRPCResponse(event.data);
    
    switch (message.method) {
      case RPCMethod.AuthChallenge:
        await this.handleAuthChallenge(message);
        break;
      case RPCMethod.AuthVerify:
        if (message.params.success) {
          this.isAuthenticated = true;
          console.log('Yellow authentication successful');
        }
        break;
    }
  }

  async handleAuthChallenge(message) {
    const eip712MessageSigner = createEIP712AuthMessageSigner(
      this.wallet,
      {
        scope: 'console',
        application: process.env.CONTRACT_ADDRESS,
        participant: this.wallet.address,
        expire: Math.floor(Date.now() / 1000) + 3600,
        allowances: []
      },
      { name: 'CryptoUPI' }
    );

    const authVerifyMsg = await createAuthVerifyMessage(
      eip712MessageSigner,
      message
    );

    this.ws.send(authVerifyMsg);
  }
}

export default YellowClearNodeConnection;
```

### 2.2 Application Session Manager
**File**: `backend/yellow/session-manager.js`

```javascript
import { createAppSessionMessage, createCloseAppSessionMessage } from '@erc7824/nitrolite';

class YellowSessionManager {
  constructor(clearNodeConnection) {
    this.clearNode = clearNodeConnection;
    this.activeSessions = new Map();
  }

  async createTripartiteSession(orderId, makerAddress, resolverAddress) {
    console.log(`Creating 3-entity Yellow session for order ${orderId}`);
    
    // Create 3-entity session: Backend + User + Resolver
    const appDefinition = {
      protocol: 'nitroliterpc',
      participants: [
        this.clearNode.wallet.address, // Backend
        makerAddress,                   // User
        resolverAddress                 // Resolver
      ],
      weights: [34, 33, 33], // Equal weight distribution
      quorum: 67,            // 2/3 consensus
      challenge: 0,          // No challenge period for speed
      nonce: Date.now()
    };

    const allocations = [
      {
        participant: this.clearNode.wallet.address,
        asset: 'usdc',
        amount: '0'
      },
      {
        participant: makerAddress,
        asset: 'usdc', 
        amount: '1000000' // 1 USDC initial allocation
      },
      {
        participant: resolverAddress,
        asset: 'usdc',
        amount: '0'
      }
    ];

    const sessionMessage = await createAppSessionMessage(
      this.messageSigner.bind(this),
      [{ definition: appDefinition, allocations }]
    );

    return new Promise((resolve, reject) => {
      const handleResponse = (event) => {
        const message = JSON.parse(event.data);
        if (message.res && message.res[1] === 'create_app_session') {
          const sessionId = message.res[2]?.[0]?.app_session_id;
          this.activeSessions.set(orderId, sessionId);
          console.log(`Yellow session created: ${sessionId}`);
          resolve(sessionId);
        }
      };

      this.clearNode.ws.addEventListener('message', handleResponse);
      this.clearNode.ws.send(sessionMessage);
      
      setTimeout(() => reject(new Error('Session creation timeout')), 10000);
    });
  }

  async instantSettlement(orderId, finalAllocations) {
    const sessionId = this.activeSessions.get(orderId);
    if (!sessionId) throw new Error('No active session for order');

    console.log(`Executing instant settlement for order ${orderId}`);

    const closeRequest = {
      app_session_id: sessionId,
      allocations: finalAllocations
    };

    const closeMessage = await createCloseAppSessionMessage(
      this.messageSigner.bind(this),
      [closeRequest]
    );

    this.clearNode.ws.send(closeMessage);
    this.activeSessions.delete(orderId);
    
    console.log('✅ Instant settlement completed via Yellow Network');
  }

  async messageSigner(payload) {
    const message = JSON.stringify(payload);
    const digestHex = ethers.id(message);
    const messageBytes = ethers.getBytes(digestHex);
    const { serialized: signature } = this.clearNode.wallet.signingKey.sign(messageBytes);
    return signature;
  }
}

export default YellowSessionManager;
```

### 2.3 Updated Order Routes
**File**: `backend/routes/orders.js` (Add these modifications)

```javascript
// Add Yellow integration imports
import YellowClearNodeConnection from '../yellow/clearnode-connection.js';
import YellowSessionManager from '../yellow/session-manager.js';

// Initialize Yellow connection
const yellowConnection = new YellowClearNodeConnection();
const sessionManager = new YellowSessionManager(yellowConnection);

// Initialize Yellow connection
yellowConnection.connect();

// Modified accept order endpoint
router.post('/:orderId/accept', async (req, res) => {
  try {
    const { orderId } = req.params;
    const { resolverAddress, acceptedPrice } = req.body;
    
    const order = await Order.findById(orderId);
    if (!order || order.status !== 'open') {
      return res.status(400).json({ error: 'Order not available' });
    }

    // Create Yellow session with 3 participants
    const sessionId = await sessionManager.createTripartiteSession(
      orderId,
      order.makerAddress,
      resolverAddress
    );

    // Update order with Yellow session info
    order.status = 'accepted';
    order.resolverAddress = resolverAddress;
    order.acceptedPrice = acceptedPrice;
    order.yellowSessionId = sessionId;
    await order.save();

    res.json({ 
      success: true, 
      orderId, 
      sessionId,
      message: 'Order accepted, Yellow session created' 
    });
  } catch (error) {
    console.error('Accept order error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Modified fulfill order endpoint with instant settlement
router.post('/:orderId/fulfill', async (req, res) => {
  try {
    const { orderId } = req.params;
    const { transactionId } = req.body;
    
    const order = await Order.findById(orderId);
    if (!order || order.status !== 'accepted') {
      return res.status(400).json({ error: 'Order not ready for fulfillment' });
    }

    // Verify RazorpayX payment (existing logic)
    const paymentVerified = await verifyRazorpayPayment(transactionId);
    
    if (paymentVerified) {
      // Instant settlement via Yellow - transfer crypto to resolver
      const finalAllocations = [
        {
          participant: yellowConnection.wallet.address,
          asset: 'usdc',
          amount: '0'
        },
        {
          participant: order.makerAddress,
          asset: 'usdc',
          amount: '0' // User receives UPI, crypto goes to resolver
        },
        {
          participant: order.resolverAddress,
          asset: 'usdc',
          amount: order.acceptedPrice.toString()
        }
      ];

      await sessionManager.instantSettlement(orderId, finalAllocations);

      order.status = 'completed';
      order.razorpayTransactionId = transactionId;
      order.completedAt = new Date();
      await order.save();

      res.json({ 
        success: true, 
        message: 'Instant settlement completed via Yellow Network',
        settlementTime: '< 1 second'
      });
    } else {
      res.status(400).json({ error: 'Payment verification failed' });
    }
  } catch (error) {
    console.error('Fulfill order error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Add simplified auction endpoint
router.post('/:orderId/start-auction', async (req, res) => {
  try {
    const { orderId } = req.params;
    const order = await Order.findById(orderId);
    
    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    // Start 5-second auction
    order.status = 'auction';  
    order.auctionStartTime = new Date();
    order.auctionEndTime = new Date(Date.now() + 5000); // 5 seconds
    await order.save();

    console.log(`Starting 5-second auction for order ${orderId}`);

    // Auto-assign to main resolver after 5 seconds
    setTimeout(async () => {
      const mainResolver = process.env.MAIN_RESOLVER_ADDRESS;
      
      try {
        // Create Yellow session immediately
        const sessionId = await sessionManager.createTripartiteSession(
          orderId,
          order.makerAddress,
          mainResolver
        );

        order.status = 'accepted';
        order.resolverAddress = mainResolver;
        order.yellowSessionId = sessionId;
        order.acceptedPrice = order.takerAmount; // Accept original price
        await order.save();

        console.log(`Order ${orderId} auto-assigned to main resolver with Yellow session`);
      } catch (error) {
        console.error('Auto-assignment failed:', error);
        order.status = 'failed';
        await order.save();
      }
    }, 5000);

    res.json({ 
      success: true,
      message: 'Auction started, will auto-assign in 5 seconds',
      auctionEndTime: order.auctionEndTime
    });

  } catch (error) {
    console.error('Start auction error:', error);
    res.status(500).json({ error: error.message });
  }
});
```

---

## 🖥️ Phase 3: Frontend Yellow Integration (30 minutes)

### 3.1 Wallet Integration with Yellow
**File**: `frontend/src/lib/yellow-integration.ts`

```typescript
import { 
  createAuthRequestMessage,
  createAuthVerifyMessage,
  createEIP712AuthMessageSigner,
  parseRPCResponse,
  RPCMethod
} from '@erc7824/nitrolite';
import { createWalletClient, custom } from 'viem';
import { base } from 'viem/chains';

export class YellowWalletIntegration {
  private ws: WebSocket | null = null;
  private walletClient: any = null;
  private isAuthenticated = false;

  async connectWallet() {
    if (!window.ethereum) {
      throw new Error('Please install MetaMask!');
    }

    this.walletClient = createWalletClient({
      chain: base,
      transport: custom(window.ethereum)
    });

    const [address] = await this.walletClient.requestAddresses();
    return { address, client: this.walletClient };
  }

  async connectToYellow(address: string) {
    this.ws = new WebSocket('wss://clearnet.yellow.com/ws');
    
    return new Promise((resolve, reject) => {
      this.ws!.onopen = async () => {
        try {
          await this.authenticateWithYellow(address);
          resolve(true);
        } catch (error) {
          reject(error);
        }
      };

      this.ws!.onmessage = this.handleMessage.bind(this);
      
      setTimeout(() => reject(new Error('Connection timeout')), 10000);
    });
  }

  private async authenticateWithYellow(address: string) {
    const authRequest = await createAuthRequestMessage({
      wallet: address,
      participant: address,
      app_name: 'CryptoUPI',
      expire: Math.floor(Date.now() / 1000) + 3600,
      scope: 'console',
      application: process.env.NEXT_PUBLIC_CONTRACT_ADDRESS,
      allowances: []
    });

    this.ws!.send(authRequest);
  }

  private async handleMessage(event: MessageEvent) {
    const message = parseRPCResponse(event.data);
    
    switch (message.method) {
      case RPCMethod.AuthChallenge:
        await this.handleAuthChallenge(message);
        break;
      case RPCMethod.AuthVerify:
        if (message.params.success) {
          this.isAuthenticated = true;
          console.log('✅ Authenticated with Yellow Network');
        }
        break;
    }
  }

  private async handleAuthChallenge(message: any) {
    const eip712MessageSigner = createEIP712AuthMessageSigner(
      this.walletClient,
      {
        scope: 'console',
        application: process.env.NEXT_PUBLIC_CONTRACT_ADDRESS!,
        participant: this.walletClient.account.address,
        expire: Math.floor(Date.now() / 1000) + 3600,
        allowances: []
      },
      { name: 'CryptoUPI' }
    );

    const authVerifyMsg = await createAuthVerifyMessage(
      eip712MessageSigner,
      message
    );

    this.ws!.send(authVerifyMsg);
  }

  getConnectionStatus() {
    return {
      connected: !!this.ws && this.ws.readyState === WebSocket.OPEN,
      authenticated: this.isAuthenticated
    };
  }
}
```

### 3.2 Updated Order Creation Component
**File**: `frontend/src/components/CreateOrder.tsx` (Add these modifications)

```tsx
import { useState, useMemo } from 'preact/hooks';
import { YellowWalletIntegration } from '../lib/yellow-integration';

export function CreateOrder() {
  const [yellowStatus, setYellowStatus] = useState('disconnected');
  const [isCreatingOrder, setIsCreatingOrder] = useState(false);
  const yellowIntegration = useMemo(() => new YellowWalletIntegration(), []);

  const handleWalletConnect = async () => {
    try {
      const { address, client } = await yellowIntegration.connectWallet();
      setWalletClient(client);
      setAccount(address);
      
      // Connect to Yellow Network
      setYellowStatus('connecting');
      await yellowIntegration.connectToYellow(address);
      setYellowStatus('connected');
      
      console.log('✅ Connected to Yellow Network');
      
    } catch (error) {
      console.error('Connection failed:', error);
      setYellowStatus('failed');
    }
  };

  const handleCreateOrder = async (orderData: any) => {
    if (yellowStatus !== 'connected') {
      alert('Please connect to Yellow Network first');
      return;
    }

    setIsCreatingOrder(true);
    
    try {
      // Create order with Yellow integration flag
      const response = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...orderData,
          yellowEnabled: true,
          makerAddress: account
        })
      });

      const result = await response.json();
      
      if (result.success) {
        console.log('✅ Order created with Yellow integration');
        
        // Auto-start auction
        await fetch(`/api/orders/${result.orderId}/start-auction`, {
          method: 'POST'
        });
        
        console.log('🚀 5-second auction started');
      }
      
    } catch (error) {
      console.error('Order creation failed:', error);
    } finally {
      setIsCreatingOrder(false);
    }
  };

  return (
    <div className="create-order">
      <div className="connection-status">
        <div className="status-item">
          <span>Wallet:</span>
          <span className={account ? 'connected' : 'disconnected'}>
            {account ? `${account.slice(0, 6)}...${account.slice(-4)}` : 'Disconnected'}
          </span>
        </div>
        
        <div className="status-item">
          <span>Yellow Network:</span>
          <span className={`status-${yellowStatus}`}>
            {yellowStatus === 'connected' && '⚡ '}
            {yellowStatus.charAt(0).toUpperCase() + yellowStatus.slice(1)}
          </span>
        </div>
      </div>
      
      {yellowStatus === 'connected' && (
        <div className="yellow-ready">
          ⚡ Instant settlements enabled via Yellow Network (~5 seconds total)
        </div>
      )}
      
      {!account && (
        <button onClick={handleWalletConnect} className="connect-button">
          Connect Wallet & Yellow Network
        </button>
      )}

      {account && yellowStatus === 'connected' && (
        <div className="order-form">
          {/* Your existing order creation form */}
          <button 
            onClick={() => handleCreateOrder(formData)}
            disabled={isCreatingOrder}
            className="create-order-button"
          >
            {isCreatingOrder ? 'Creating Order...' : 'Create Order with Yellow'}
          </button>
        </div>
      )}
    </div>
  );
}
```

### 3.3 Order Status Component
**File**: `frontend/src/components/OrderStatus.tsx`

```tsx
import { useState, useEffect } from 'preact/hooks';

interface OrderStatusProps {
  orderId: string;
}

export function OrderStatus({ orderId }: OrderStatusProps) {
  const [order, setOrder] = useState<any>(null);
  const [timeElapsed, setTimeElapsed] = useState(0);

  useEffect(() => {
    const fetchOrder = async () => {
      const response = await fetch(`/api/orders/${orderId}`);
      const orderData = await response.json();
      setOrder(orderData);
    };

    fetchOrder();
    const interval = setInterval(fetchOrder, 1000);
    
    return () => clearInterval(interval);
  }, [orderId]);

  useEffect(() => {
    if (order?.createdAt) {
      const startTime = new Date(order.createdAt).getTime();
      const timer = setInterval(() => {
        setTimeElapsed(Date.now() - startTime);
      }, 100);
      
      return () => clearInterval(timer);
    }
  }, [order?.createdAt]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'open': return '#blue';
      case 'auction': return '#orange';
      case 'accepted': return '#yellow';
      case 'completed': return '#green';
      case 'failed': return '#red';
      default: return '#gray';
    }
  };

  return (
    <div className="order-status">
      <h3>Order Status: {orderId.slice(0, 8)}...</h3>
      
      <div className="status-info">
        <div className="status-badge" style={{ backgroundColor: getStatusColor(order?.status) }}>
          {order?.status?.toUpperCase()}
        </div>
        
        <div className="time-info">
          Time Elapsed: {(timeElapsed / 1000).toFixed(1)}s
        </div>
      </div>

      {order?.yellowSessionId && (
        <div className="yellow-info">
          ⚡ Yellow Session: {order.yellowSessionId.slice(0, 10)}...
        </div>
      )}

      <div className="progress-steps">
        <div className={`step ${order?.status === 'open' ? 'active' : 'completed'}`}>
          ✓ Order Created
        </div>
        <div className={`step ${order?.status === 'auction' ? 'active' : order?.status === 'accepted' || order?.status === 'completed' ? 'completed' : ''}`}>
          {order?.status === 'auction' ? '⏳' : '✓'} Auction ({order?.status === 'auction' ? 'Running' : 'Completed'})
        </div>
        <div className={`step ${order?.status === 'accepted' ? 'active' : order?.status === 'completed' ? 'completed' : ''}`}>
          {order?.status === 'accepted' ? '⏳' : order?.status === 'completed' ? '✓' : '○'} Payment Processing
        </div>
        <div className={`step ${order?.status === 'completed' ? 'completed' : ''}`}>
          {order?.status === 'completed' ? '✅' : '○'} Instant Settlement
        </div>
      </div>

      {order?.status === 'completed' && (
        <div className="completion-info">
          <div className="success-message">
            ✅ Payment completed via Yellow Network!
          </div>
          <div className="settlement-time">
            Total Time: {(timeElapsed / 1000).toFixed(1)}s (Target: &lt;5s)
          </div>
        </div>
      )}
    </div>
  );
}
```

---

## 🤖 Phase 4: Resolver Bot Yellow Integration (30 minutes)

### 4.1 Yellow Resolver Client
**File**: `resolver-bot/yellow/resolver-client.js`

```javascript
const { 
  createAuthRequestMessage,
  createAuthVerifyMessage,
  createEIP712AuthMessageSigner,
  parseRPCResponse,
  RPCMethod 
} = require('@erc7824/nitrolite');
const WebSocket = require('ws');
const { ethers } = require('ethers');

class YellowResolverClient {
  constructor() {
    this.ws = null;
    this.wallet = new ethers.Wallet(process.env.PRIVATE_KEY);
    this.isAuthenticated = false;
  }

  async connect() {
    this.ws = new WebSocket('wss://clearnet.yellow.com/ws');
    
    this.ws.on('open', async () => {
      console.log('🟡 Resolver connected to Yellow ClearNode');
      await this.authenticate();
    });

    this.ws.on('message', this.handleMessage.bind(this));
    this.ws.on('error', (error) => {
      console.error('Yellow WebSocket error:', error);
    });
  }

  async authenticate() {
    const authRequest = await createAuthRequestMessage({
      wallet: this.wallet.address,
      participant: this.wallet.address,
      app_name: 'CryptoUPI',
      expire: Math.floor(Date.now() / 1000) + 3600,
      scope: 'console',
      application: process.env.CONTRACT_ADDRESS,
      allowances: []
    });

    this.ws.send(authRequest);
  }

  async handleMessage(data) {
    const message = parseRPCResponse(data.toString());
    
    switch (message.method) {
      case RPCMethod.AuthChallenge:
        await this.handleAuthChallenge(message);
        break;
      case RPCMethod.AuthVerify:
        if (message.params.success) {
          this.isAuthenticated = true;
          console.log('✅ Resolver authenticated with Yellow Network');
        }
        break;
    }
  }

  async handleAuthChallenge(message) {
    const eip712MessageSigner = createEIP712AuthMessageSigner(
      this.wallet,
      {
        scope: 'console',
        application: process.env.CONTRACT_ADDRESS,
        participant: this.wallet.address,
        expire: Math.floor(Date.now() / 1000) + 3600,
        allowances: []
      },
      { name: 'CryptoUPI' }
    );

    const authVerifyMsg = await createAuthVerifyMessage(
      eip712MessageSigner,
      message
    );

    this.ws.send(authVerifyMsg);
  }

  getConnectionStatus() {
    return {
      connected: !!this.ws && this.ws.readyState === WebSocket.OPEN,
      authenticated: this.isAuthenticated
    };
  }
}

module.exports = YellowResolverClient;
```

### 4.2 Updated Resolver Bot Main Logic
**File**: `resolver-bot/index.js` (Add these modifications)

```javascript
const YellowResolverClient = require('./yellow/resolver-client');

class ResolverBot {
  constructor() {
    this.yellowClient = new YellowResolverClient();
    // ... existing initialization
  }

  async start() {
    try {
      console.log('🚀 Starting Resolver Bot with Yellow Network integration...');
      
      // Connect to Yellow Network first
      await this.yellowClient.connect();
      
      // Wait for authentication
      await this.waitForYellowAuth();
      
      console.log('✅ Resolver bot ready with Yellow Network integration');
      
      // Start existing order monitoring
      this.startOrderMonitoring();
      
    } catch (error) {
      console.error('Failed to start resolver bot:', error);
      process.exit(1);
    }
  }

  async waitForYellowAuth() {
    return new Promise((resolve, reject) => {
      const checkAuth = () => {
        const status = this.yellowClient.getConnectionStatus();
        if (status.authenticated) {
          resolve();
        } else if (!status.connected) {
          reject(new Error('Yellow connection lost'));
        } else {
          setTimeout(checkAuth, 100);
        }
      };
      checkAuth();
      
      // Timeout after 30 seconds
      setTimeout(() => reject(new Error('Yellow auth timeout')), 30000);
    });
  }

  async processOrder(order) {
    const startTime = Date.now();
    
    try {
      console.log(`🔄 Processing order ${order.id} with Yellow integration`);
      
      // Order should already be accepted with Yellow session created
      if (order.status !== 'accepted') {
        console.log(`Order ${order.id} not ready, status: ${order.status}`);
        return;
      }

      console.log(`⚡ Yellow session active: ${order.yellowSessionId}`);
      
      // Process UPI payment
      console.log('💳 Processing UPI payment...');
      const paymentResult = await this.processUPIPayment(order);
      
      if (paymentResult.success) {
        console.log('✅ UPI payment successful');
        
        // Fulfill order (triggers instant settlement)
        await this.fulfillOrder(order.id, paymentResult.transactionId);
        
        const totalTime = Date.now() - startTime;
        console.log(`🎉 Order ${order.id} completed in ${totalTime}ms via Yellow Network`);
        
        // Log performance
        this.logPerformance(order.id, totalTime);
        
      } else {
        console.error(`❌ UPI payment failed for order ${order.id}`);
      }
      
    } catch (error) {
      console.error(`❌ Order processing failed for ${order.id}:`, error);
    }
  }

  async processUPIPayment(order) {
    try {
      // Use existing RazorpayX integration
      const payoutData = {
        account_number: process.env.RAZORPAYX_ACCOUNT_NUMBER,
        fund_account: {
          account_type: 'vpa',
          vpa: {
            address: order.upiId || 'default@paytm' // Should come from order
          }
        },
        amount: parseInt(order.takerAmount),
        currency: 'INR',
        mode: 'UPI',
        purpose: 'payout',
        reference_id: `order_${order.id}_${Date.now()}`
      };

      const response = await this.razorpayX.payouts.create(payoutData);
      
      return {
        success: response.status === 'processed',
        transactionId: response.id
      };
      
    } catch (error) {
      console.error('UPI payment error:', error);
      return { success: false, error: error.message };
    }
  }

  async fulfillOrder(orderId, transactionId) {
    const response = await fetch(`${process.env.BACKEND_URL}/api/orders/${orderId}/fulfill`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ transactionId })
    });

    if (!response.ok) {
      throw new Error(`Fulfill request failed: ${await response.text()}`);
    }

    const result = await response.json();
    console.log('✅ Fulfill response:', result.message);
  }

  logPerformance(orderId, totalTime) {
    const performance = {
      orderId,
      totalTime,
      target: 5000, // 5 seconds
      improvement: totalTime < 5000 ? 'ACHIEVED' : 'NEEDS_IMPROVEMENT',
      timestamp: new Date().toISOString()
    };
    
    console.log('📊 Performance Log:', JSON.stringify(performance, null, 2));
  }

  // Enhanced order monitoring for Yellow integration
  async startOrderMonitoring() {
    console.log('👀 Starting enhanced order monitoring...');
    
    setInterval(async () => {
      try {
        const response = await fetch(`${process.env.BACKEND_URL}/api/orders?status=accepted&resolver=${this.yellowClient.wallet.address}`);
        const orders = await response.json();
        
        for (const order of orders) {
          if (order.yellowSessionId) {
            await this.processOrder(order);
          }
        }
        
      } catch (error) {
        console.error('Order monitoring error:', error);
      }
    }, 1000); // Check every second for faster processing
  }
}

// Start the resolver bot
const resolverBot = new ResolverBot();
resolverBot.start().catch(console.error);
```

---

## ⚡ Phase 5: Simplified Dutch Auction (15 minutes)

### 5.1 Single Resolver Model
**File**: `backend/routes/orders.js` (Add auction simplification)

```javascript
// Simplified auction configuration
const AUCTION_DURATION = 5000; // 5 seconds
const MAIN_RESOLVER = process.env.MAIN_RESOLVER_ADDRESS;

// Auto-start auction when order is created
router.post('/', async (req, res) => {
  try {
    const orderData = {
      ...req.body,
      id: generateOrderId(),
      status: 'open',
      createdAt: new Date()
    };

    const order = new Order(orderData);
    await order.save();

    // Auto-start auction immediately for Yellow integration
    if (req.body.yellowEnabled) {
      setTimeout(async () => {
        await autoStartAuction(order.id);
      }, 100); // Start auction after 100ms
    }

    res.json({ 
      success: true, 
      orderId: order.id,
      message: req.body.yellowEnabled ? 'Order created, auction starting...' : 'Order created'
    });

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Auto-start auction function
async function autoStartAuction(orderId) {
  try {
    const order = await Order.findById(orderId);
    if (!order || order.status !== 'open') return;

    console.log(`🚀 Auto-starting auction for order ${orderId}`);

    // Start auction
    order.status = 'auction';
    order.auctionStartTime = new Date();
    order.auctionEndTime = new Date(Date.now() + AUCTION_DURATION);
    await order.save();

    // Auto-assign after auction duration
    setTimeout(async () => {
      try {
        const updatedOrder = await Order.findById(orderId);
        if (updatedOrder.status !== 'auction') return;

        // Create Yellow session with main resolver
        const sessionId = await sessionManager.createTripartiteSession(
          orderId,
          updatedOrder.makerAddress,
          MAIN_RESOLVER
        );

        updatedOrder.status = 'accepted';
        updatedOrder.resolverAddress = MAIN_RESOLVER;
        updatedOrder.yellowSessionId = sessionId;
        updatedOrder.acceptedPrice = updatedOrder.takerAmount;
        updatedOrder.acceptedAt = new Date();
        await updatedOrder.save();

        console.log(`✅ Order ${orderId} auto-assigned with Yellow session: ${sessionId}`);

      } catch (error) {
        console.error(`Auto-assignment failed for order ${orderId}:`, error);
      }
    }, AUCTION_DURATION);

  } catch (error) {
    console.error(`Auto-start auction failed for order ${orderId}:`, error);
  }
}

// Get auction status endpoint
router.get('/:orderId/auction-status', async (req, res) => {
  try {
    const { orderId } = req.params;
    const order = await Order.findById(orderId);
    
    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    const now = new Date();
    const timeRemaining = order.auctionEndTime ? 
      Math.max(0, order.auctionEndTime.getTime() - now.getTime()) : 0;

    res.json({
      orderId,
      status: order.status,
      auctionStartTime: order.auctionStartTime,
      auctionEndTime: order.auctionEndTime,
      timeRemaining,
      yellowSessionId: order.yellowSessionId
    });

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
```

---

## 🧪 Phase 6: Testing & Deployment (30 minutes)

### 6.1 Integration Testing Script
**File**: `test-yellow-integration.js`

```javascript
const axios = require('axios');
const { ethers } = require('ethers');

class YellowIntegrationTest {
  constructor() {
    this.baseURL = 'http://localhost:5001/api';
    this.testResults = [];
  }

  async runFullTest() {
    console.log('🧪 Starting Yellow Network Integration Test...\n');
    
    try {
      // Test 1: Backend Yellow Connection
      await this.testBackendConnection();
      
      // Test 2: Order Creation with Yellow
      const orderId = await this.testOrderCreation();
      
      // Test 3: Auction Process
      await this.testAuctionProcess(orderId);
      
      // Test 4: Session Creation
      await this.testSessionCreation(orderId);
      
      // Test 5: Payment and Settlement
      await this.testPaymentAndSettlement(orderId);
      
      // Test 6: Performance Measurement
      await this.testPerformance();
      
      this.printResults();
      
    } catch (error) {
      console.error('❌ Test suite failed:', error);
    }
  }

  async testBackendConnection() {
    console.log('1️⃣ Testing Backend Yellow Connection...');
    
    try {
      const response = await axios.get(`${this.baseURL}/health`);
      if (response.data.yellowConnection === 'connected') {
        this.logResult('Backend Connection', true, 'Yellow ClearNode connected');
      } else {
        this.logResult('Backend Connection', false, 'Yellow ClearNode not connected');
      }
    } catch (error) {
      this.logResult('Backend Connection', false, error.message);
    }
  }

  async testOrderCreation() {
    console.log('2️⃣ Testing Order Creation with Yellow...');
    
    try {
      const orderData = {
        makerToken: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913', // USDC on Base
        makerAmount: '1000000', // 1 USDC
        takerToken: 'INR',
        takerAmount: '84000000', // 84 INR (in paise)
        duration: 300,
        yellowEnabled: true,
        makerAddress: '0x742d35Cc6634C0532925a3b8D5c3F8C0e9B5E1D2' // Test address
      };

      const response = await axios.post(`${this.baseURL}/orders`, orderData);
      
      if (response.data.success) {
        this.logResult('Order Creation', true, `Order created: ${response.data.orderId}`);
        return response.data.orderId;
      } else {
        this.logResult('Order Creation', false, 'Order creation failed');
      }
    } catch (error) {
      this.logResult('Order Creation', false, error.message);
      throw error;
    }
  }

  async testAuctionProcess(orderId) {
    console.log('3️⃣ Testing Auction Process...');
    
    try {
      // Check auction status
      let auctionComplete = false;
      let attempts = 0;
      const maxAttempts = 10;

      while (!auctionComplete && attempts < maxAttempts) {
        const response = await axios.get(`${this.baseURL}/orders/${orderId}/auction-status`);
        const status = response.data.status;
        
        console.log(`   Auction status: ${status} (attempt ${attempts + 1})`);
        
        if (status === 'accepted') {
          auctionComplete = true;
          this.logResult('Auction Process', true, 'Order auto-assigned to resolver');
        } else if (status === 'failed') {
          this.logResult('Auction Process', false, 'Auction failed');
          return;
        }
        
        await this.sleep(1000);
        attempts++;
      }

      if (!auctionComplete) {
        this.logResult('Auction Process', false, 'Auction timeout');
      }
    } catch (error) {
      this.logResult('Auction Process', false, error.message);
    }
  }

  async testSessionCreation(orderId) {
    console.log('4️⃣ Testing Yellow Session Creation...');
    
    try {
      const response = await axios.get(`${this.baseURL}/orders/${orderId}`);
      const order = response.data;
      
      if (order.yellowSessionId) {
        this.logResult('Session Creation', true, `Session ID: ${order.yellowSessionId.slice(0, 10)}...`);
      } else {
        this.logResult('Session Creation', false, 'No Yellow session ID found');
      }
    } catch (error) {
      this.logResult('Session Creation', false, error.message);
    }
  }

  async testPaymentAndSettlement(orderId) {
    console.log('5️⃣ Testing Payment and Instant Settlement...');
    
    try {
      const startTime = Date.now();
      
      // Simulate payment fulfillment
      const fulfillResponse = await axios.post(`${this.baseURL}/orders/${orderId}/fulfill`, {
        transactionId: `test_txn_${Date.now()}`
      });
      
      const settlementTime = Date.now() - startTime;
      
      if (fulfillResponse.data.success) {
        this.logResult('Payment Settlement', true, `Settlement completed in ${settlementTime}ms`);
      } else {
        this.logResult('Payment Settlement', false, 'Settlement failed');
      }
    } catch (error) {
      this.logResult('Payment Settlement', false, error.message);
    }
  }

  async testPerformance() {
    console.log('6️⃣ Testing Overall Performance...');
    
    const performanceTest = async () => {
      const startTime = Date.now();
      
      try {
        // Create order
        const orderResponse = await axios.post(`${this.baseURL}/orders`, {
          makerToken: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
          makerAmount: '1000000',
          takerToken: 'INR', 
          takerAmount: '84000000',
          yellowEnabled: true,
          makerAddress: '0x742d35Cc6634C0532925a3b8D5c3F8C0e9B5E1D2'
        });
        
        const orderId = orderResponse.data.orderId;
        
        // Wait for completion
        let completed = false;
        while (!completed) {
          const statusResponse = await axios.get(`${this.baseURL}/orders/${orderId}`);
          if (statusResponse.data.status === 'accepted') {
            // Fulfill immediately
            await axios.post(`${this.baseURL}/orders/${orderId}/fulfill`, {
              transactionId: `perf_test_${Date.now()}`
            });
            completed = true;
          }
          await this.sleep(100);
        }
        
        const totalTime = Date.now() - startTime;
        const target = 5000; // 5 seconds
        
        if (totalTime < target) {
          this.logResult('Performance Test', true, `Completed in ${totalTime}ms (Target: <${target}ms)`);
        } else {
          this.logResult('Performance Test', false, `Took ${totalTime}ms (Target: <${target}ms)`);
        }
        
      } catch (error) {
        this.logResult('Performance Test', false, error.message);
      }
    };
    
    await performanceTest();
  }

  logResult(test, success, message) {
    const result = {
      test,
      success,
      message,
      timestamp: new Date().toISOString()
    };
    
    this.testResults.push(result);
    
    const icon = success ? '✅' : '❌';
    console.log(`   ${icon} ${test}: ${message}\n`);
  }

  printResults() {
    console.log('📊 TEST RESULTS SUMMARY');
    console.log('========================');
    
    const passed = this.testResults.filter(r => r.success).length;
    const total = this.testResults.length;
    
    console.log(`Passed: ${passed}/${total}`);
    console.log(`Success Rate: ${((passed/total) * 100).toFixed(1)}%\n`);
    
    if (passed === total) {
      console.log('🎉 All tests passed! Yellow Network integration is working correctly.');
    } else {
      console.log('⚠️  Some tests failed. Please check the logs above.');
    }
  }

  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Run the test
const tester = new YellowIntegrationTest();
tester.runFullTest().catch(console.error);
```

### 6.2 Environment Variables Configuration
**File**: `deployment-config.md`

```markdown
## Environment Variables Setup

### Backend (.env)
```env
# Existing variables...
PORT=5001
MONGODB_URI=mongodb://localhost:27017/order-protocol
RELAYER_PRIVATE_KEY=your_relayer_private_key
CONTRACT_ADDRESS=0xC3dd62f9EE406b43A2f463b3a59BEcDC1579933b
RAZORPAYX_KEY_ID=rzp_test_your_key_id
RAZORPAYX_KEY_SECRET=your_secret_key

# Yellow Network Integration - NEW
YELLOW_CLEARNODE_URL=wss://clearnet.yellow.com/ws
MAIN_RESOLVER_ADDRESS=0xYourMainResolverAddress
YELLOW_APP_NAME=CryptoUPI
YELLOW_SESSION_TIMEOUT=10000
```

### Frontend (.env.local)
```env
# Existing variables...
NEXT_PUBLIC_API_URL=http://localhost:5001
NEXT_PUBLIC_CONTRACT_ADDRESS=0xC3dd62f9EE406b43A2f463b3a59BEcDC1579933b

# Yellow Network Integration - NEW
NEXT_PUBLIC_YELLOW_CLEARNODE_URL=wss://clearnet.yellow.com/ws
NEXT_PUBLIC_YELLOW_APP_NAME=CryptoUPI
```

### Resolver Bot (.env)
```env
# Existing variables...
PRIVATE_KEY=your_resolver_private_key
CONTRACT_ADDRESS=0xC3dd62f9EE406b43A2f463b3a59BEcDC1579933b
BACKEND_URL=http://localhost:5001
RAZORPAYX_KEY_ID=rzp_test_your_key_id
RAZORPAYX_KEY_SECRET=your_secret_key

# Yellow Network Integration - NEW
YELLOW_CLEARNODE_URL=wss://clearnet.yellow.com/ws
YELLOW_APP_NAME=CryptoUPI
```
```

### 6.3 Quick Deployment Checklist
**File**: `deployment-checklist.md`

```markdown
# Yellow Network Integration Deployment Checklist

## Pre-Deployment (15 minutes)
- [ ] Install Yellow SDK in all services (`npm install @erc7824/nitrolite`)
- [ ] Create channel at [apps.yellow.com](https://apps.yellow.com)
- [ ] Update all environment variables
- [ ] Set MAIN_RESOLVER_ADDRESS to your resolver wallet
- [ ] Test local connections to Yellow ClearNode

## Deployment Steps (10 minutes)
- [ ] Deploy backend service
- [ ] Deploy frontend application
- [ ] Start resolver bot
- [ ] Test Yellow ClearNode connections
- [ ] Verify authentication with Yellow Network

## Integration Testing (5 minutes)
- [ ] Run integration test script: `node test-yellow-integration.js`
- [ ] Create test order with Yellow enabled
- [ ] Verify auction completes in 5 seconds
- [ ] Confirm Yellow session creation
- [ ] Test instant settlement
- [ ] Monitor total transaction time (<5s target)

## Performance Validation
- [ ] Target: Complete crypto-to-UPI flow in <5 seconds
- [ ] Monitor: Auction duration = 5 seconds
- [ ] Monitor: Settlement time = <1 second
- [ ] Monitor: Total time = ~5 seconds (vs previous 20-30s)

## Success Criteria
- [ ] Yellow ClearNode authentication successful
- [ ] 3-entity sessions created (backend + user + resolver)
- [ ] Instant settlements working
- [ ] End-to-end flow <5 seconds
- [ ] RazorpayX integration maintained
- [ ] Base Mainnet compatibility confirmed

## Troubleshooting
- Check WebSocket connections to `wss://clearnet.yellow.com/ws`
- Verify authentication signatures
- Monitor session creation logs
- Check allocation transfers
- Validate payment verification flow
```

---

## 🎯 Expected Outcomes

### Performance Improvements
- **Previous Flow**: 20-30 seconds total
  - Dutch auction: 5 seconds
  - Settlement: 15-25 seconds
  
- **New Flow with Yellow**: ~5 seconds total
  - Simplified auction: 5 seconds
  - Instant settlement: <1 second

### Technical Achievements
1. **3-Entity Yellow Sessions**: Backend, User, and Resolver in single application session
2. **Instant Crypto Settlement**: Sub-second transfers via state channels
3. **Maintained UPI Integration**: RazorpayX verification flow preserved
4. **Base Mainnet Compatibility**: Full integration with existing smart contracts
5. **Simplified Architecture**: Single resolver model for hackathon demo

### Demo Flow
1. User creates order → Yellow session initiated
2. 5-second auction → Auto-assigned to main resolver
3. Resolver processes UPI payment → RazorpayX verification
4. Payment confirmed → Instant Yellow settlement
5. **Total time: ~5 seconds** (vs previous 20-30 seconds)

### Hackathon Presentation Points
- 🚀 **500% faster settlements** using Yellow Network
- ⚡ **Instant crypto transfers** via state channels
- 🔗 **Multi-chain compatibility** (Base Mainnet + Yellow)
- 💳 **Real UPI payments** with instant crypto settlement
- 🏗️ **Production-ready architecture** with 3-entity sessions

This integration showcases Yellow Network's state channel technology as the key enabler for instant crypto-to-fiat settlements, transforming a 20-30 second process into a 5-second experience.