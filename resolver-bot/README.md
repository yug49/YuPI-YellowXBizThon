# Resolver Bot

A 24x7 automated resolver bot for the Order Protocol that listens for OrderCreated events and automatically accepts orders via the backend API.

## Features

- 🎧 Real-time event listening for OrderCreated events
- ⚡ Fast order acceptance via API calls (target: under 5 seconds)
- � API-based architecture with relayer backend
- �💰 Smart price calculation between start and end prices
- �️ Robust error handling and retry logic
- 📊 Comprehensive logging and monitoring
- � Secure private key management

## Architecture

The resolver bot follows this flow:
1. **Event Listening**: Continuously monitors OrderCreated events from the blockchain
2. **Price Calculation**: Calculates optimal accepted price between start/end prices
3. **API Call**: Sends HTTP request to backend with order acceptance details
4. **Backend Processing**: Backend (relayer) uses its private key to call contract
5. **Confirmation**: Receives transaction confirmation and logs results

## Setup

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Configure environment:**
   Edit `.env` file with your configuration:
   ```
   PRIVATE_KEY=your_resolver_private_key
   RPC_URL=https://worldchain-sepolia.g.alchemy.com/v2/your_api_key
   CONTRACT_ADDRESS=0xC3dd62f9EE406b43A2f463b3a59BEcDC1579933b
   BACKEND_URL=http://localhost:5001
   RAZORPAYX_KEY_ID=rzp_test_your_key_id
   RAZORPAYX_KEY_SECRET=your_razorpayx_secret
   LOG_LEVEL=info
   ```

3. **Ensure backend is running:**
   ```bash
   cd ../backend && npm start
   ```

4. **Start the resolver bot:**
   ```bash
   npm start
   ```

   For development with auto-restart:
   ```bash
   npm run dev
   ```

## RazorpayX Configuration

Each resolver bot is associated with a unique RazorpayX account for payment processing:

### API Keys Setup
1. **Log in** to your RazorpayX Account
2. **Navigate** to user icon → My Profile → My Accounts & Settings
3. **Go to** Developer Controls → Generate Key
4. **Download** the keys and add them to your `.env` file

### Authentication
RazorpayX APIs use Basic Authentication with the format:
```
Authorization: Basic base64(key_id:key_secret)
```

The resolver bot automatically generates the correct Authorization header using the `getRazorpayXAuthHeader()` method.

### Environment Variables
```
RAZORPAYX_KEY_ID=rzp_test_RKftpilRBzHQUT
RAZORPAYX_KEY_SECRET=BT2naKhdfo7ekM85gNWWGl65
```

**Security Note:** Keep your API keys secure and never expose them in public repositories.

## API Integration

The bot makes HTTP POST requests to accept orders:

**Endpoint:** `POST /api/orders/{orderId}/accept`

**Payload:**
```json
{
  "acceptedPrice": "150000000000000000000",
  "resolverAddress": "0x..."
}
```

**Response:**
```json
{
  "success": true,
  "message": "Order accepted successfully",
  "data": {
    "orderId": "0x...",
    "acceptedPrice": "150000000000000000000",
    "resolverAddress": "0x...",
    "transactionHash": "0x...",
    "blockNumber": 12345,
    "gasUsed": "150000"
  }
}
```

## Configuration

### Environment Variables

- `PRIVATE_KEY`: Private key of the resolver wallet (must be registered as a resolver)
- `RPC_URL`: Blockchain RPC endpoint URL
- `CONTRACT_ADDRESS`: Address of the deployed OrderProtocol contract
- `LOG_LEVEL`: Logging level (error, warn, info, debug)

### Price Strategy

The bot currently uses a simple random price selection strategy. You can modify the `calculateAcceptedPrice` method to implement more sophisticated strategies like:
- Time-based decay (Dutch auction simulation)
- Market-based pricing
- Profit margin optimization

## Monitoring

The bot generates detailed logs in:
- `combined.log`: All log entries
- `error.log`: Error-level logs only
- Console output with colored formatting

## Error Handling

The bot handles various error scenarios:
- Network connectivity issues
- Contract interaction errors
- Invalid orders or prices
- Gas estimation failures
- Already accepted orders

## Performance

- Target order acceptance time: < 5 seconds
- Gas optimization with 20% buffer
- Automatic retry logic for transient failures

## Security

- Private key loaded from environment variables
- Input validation for all contract interactions
- Safe BigInt arithmetic for price calculations
- Graceful error handling without exposing sensitive data

## Stopping the Bot

To stop the bot gracefully:
- Press `Ctrl+C` in the terminal
- Send SIGTERM signal to the process

The bot will cleanup active listeners and exit cleanly.