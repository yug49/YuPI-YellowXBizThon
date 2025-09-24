const {
    createAuthRequestMessage,
    createAuthVerifyMessage,
    createAuthVerifyMessageFromChallenge,
    parseAnyRPCResponse,
    RPCMethod,
    createEIP712AuthMessageSigner,
} = require("@erc7824/nitrolite");
const { ethers } = require("ethers");
const { createWalletClient, http } = require("viem");
const { privateKeyToAccount } = require("viem/accounts");
const { mainnet } = require("viem/chains");
const WebSocket = require("ws");

class YellowClearNodeConnection {
    constructor() {
        this.ws = null;
        this.isAuthenticated = false;
        this.wallet = new ethers.Wallet(process.env.RELAYER_PRIVATE_KEY);
        this.sessionKey = ethers.Wallet.createRandom();

        // Create viem wallet client for EIP-712 signing using main wallet (not session key)
        // The EIP-712 signature must be from the main wallet address for verification
        const account = privateKeyToAccount(this.wallet.privateKey);
        this.viemWalletClient = createWalletClient({
            account,
            chain: mainnet,
            transport: http(),
        });

        this.reconnectAttempts = 0;
        this.maxReconnectAttempts = 5;
        this.reconnectDelay = 2000; // 2 seconds base delay
        this.requestCallbacks = new Map(); // Initialize request callback map
        this.authToken = null;
        this.sessionKeyAddress = null;
        this.authTimeout = null;
    }

    async connect() {
        try {
            console.log(
                "🟡 Connecting to Yellow ClearNode:",
                process.env.YELLOW_CLEARNODE_URL
            );
            this.ws = new WebSocket(process.env.YELLOW_CLEARNODE_URL);

            this.ws.onopen = async () => {
                console.log("🟡 Connected to Yellow ClearNode");
                this.reconnectAttempts = 0;
                await this.authenticate();
            };

            this.ws.onmessage = this.handleMessage.bind(this);

            this.ws.onerror = (error) => {
                console.error("Yellow WebSocket error:", error);
            };

            this.ws.onclose = (event) => {
                console.log(
                    `Yellow WebSocket closed: ${event.code} ${event.reason}`
                );
                this.isAuthenticated = false;
                this.handleReconnection();
            };

            // Connection timeout - only if not authenticated within 10 seconds
            this.authTimeout = setTimeout(() => {
                if (!this.isAuthenticated) {
                    console.error(
                        "❌ Yellow connection timeout during authentication"
                    );
                    this.ws?.close();
                }
            }, 10000);
        } catch (error) {
            console.error("Failed to connect to Yellow ClearNode:", error);
            throw error;
        }
    }

    async authenticate() {
        try {
            console.log("🔑 Starting Yellow Network authentication...");

            const authParams = {
                address: this.wallet.address, // Main wallet address (correct parameter name)
                session_key: this.sessionKey.address, // Session key for signing
                app_name: process.env.YELLOW_APP_NAME || "YuPI",
                application: process.env.CONTRACT_ADDRESS, // Application contract address
                allowances: [],
                expire: (Math.floor(Date.now() / 1000) + 3600).toString(), // 1 hour expiry as string
                scope: "console", // Use string, not array
            };

            console.log(
                "🔍 Auth request params:",
                JSON.stringify(authParams, null, 2)
            );

            // Create auth request with correct parameter structure from Yellow Guide
            const authRequest = await createAuthRequestMessage(authParams);

            console.log("📝 Auth request created successfully");
            console.log(
                "📤 Auth request message:",
                authRequest.substring(0, 200) + "..."
            );

            console.log("📤 Sending auth request to Yellow ClearNode");
            this.ws.send(authRequest);
        } catch (error) {
            console.error("Authentication setup failed:", error);
            throw error;
        }
    }

    async handleMessage(event) {
        try {
            // First let's see what the raw message looks like
            console.log("📨 Raw message from Yellow ClearNode:", event.data);

            // Try to parse as JSON first
            let message;
            try {
                message = JSON.parse(event.data);
                console.log("� Parsed message:", message);
            } catch (parseError) {
                console.error("Failed to parse message as JSON:", parseError);
                return;
            }

            // Check if it's an authentication challenge
            if (message.res && message.res[1] === "auth_challenge") {
                console.log("🔑 Received auth challenge");
                await this.handleAuthChallenge(message);
            } else if (message.res && message.res[1] === "auth_result") {
                console.log("🎯 Received auth result");
                this.handleAuthResult(message);
            } else {
                console.log("📩 Other message type received");
                this.handleGenericResponse(message);
            }
        } catch (error) {
            console.error("Message handling error:", error);
        }
    }

    async handleAuthChallenge(message) {
        try {
            console.log("🔑 Handling auth challenge from Yellow ClearNode");

            // Extract challenge from response (message.res[2] based on SDK analysis)
            const challengeData = message.res ? message.res[2] : message.params;
            console.log("🎯 Challenge data:", challengeData);

            // The challenge UUID is in challenge_message (snake_case)
            const challengeUuid = challengeData.challenge_message;
            console.log("🔑 Challenge UUID:", challengeUuid);

            // Create partial EIP-712 message structure for authentication
            // Important: expire must be a string representation of the timestamp
            const expireTimestamp = Math.floor(Date.now() / 1000) + 3600; // 1 hour from now

            const partialMessage = {
                scope: "console", // Must match what server expects
                application: process.env.CONTRACT_ADDRESS, // Application contract address
                participant: this.sessionKey.address, // Session key address as participant
                expire: expireTimestamp.toString(), // Convert to string as expected by server
                allowances: [], // Empty allowances array
            };

            // EIP-712 domain structure - ensure this matches server expectations
            const domain = {
                name: process.env.YELLOW_APP_NAME || "YuPI",
                // Note: No chain ID in domain per the Go server signer.go implementation
            };

            console.log(
                "🔍 EIP-712 partial message:",
                JSON.stringify(partialMessage, null, 2)
            );
            console.log("🔍 EIP-712 domain:", JSON.stringify(domain, null, 2));

            // Create EIP-712 message signer for authentication using viem wallet client
            const eip712MessageSigner = createEIP712AuthMessageSigner(
                this.viemWalletClient, // Use viem wallet client
                partialMessage, // Partial message structure
                domain // Domain structure
            );

            // Create auth verify message using challenge UUID directly
            const authVerifyMsg = await createAuthVerifyMessageFromChallenge(
                eip712MessageSigner,
                challengeUuid
            );

            console.log("📤 Sending auth verify to Yellow ClearNode");
            this.ws.send(authVerifyMsg);
        } catch (error) {
            console.error("Auth challenge handling failed:", error);
            throw error;
        }
    }

    handleAuthResult(message) {
        // Access result from correct response structure (res[2])
        const result = message.res ? message.res[2] : message.params;

        if (result && result.success) {
            this.isAuthenticated = true;
            this.authToken = result.jwt_token; // Store JWT token for reconnection
            this.sessionKeyAddress = result.session_key; // Store session key address

            // Clear auth timeout since we're now authenticated
            if (this.authTimeout) {
                clearTimeout(this.authTimeout);
                this.authTimeout = null;
            }

            console.log("✅ Yellow Network authentication successful");
            console.log(`🔑 Session key: ${this.sessionKeyAddress}`);
            console.log(
                `🎫 JWT token received (${
                    this.authToken ? "valid" : "invalid"
                })`
            );
        } else {
            console.error("❌ Yellow Network authentication failed:", result);
            throw new Error("Yellow authentication failed");
        }
    }

    handleGenericResponse(message) {
        // Handle responses for specific requests using request ID
        const requestId = message.res ? message.res[0] : message.id;
        const method = message.res ? message.res[1] : message.method;
        const data = message.res ? message.res[2] : message.params;

        console.log(`📨 Received response for method: ${method}`);

        // Handle specific message types
        switch (method) {
            case "assets":
                console.log(
                    `💎 Assets received: ${
                        data.assets ? data.assets.length : 0
                    } assets`
                );
                break;
            case "channels":
                console.log(
                    `🔗 Channels received: ${
                        data.channels ? data.channels.length : 0
                    } channels`
                );
                break;
            case "bu": // balance_updates
                console.log(
                    `💰 Balance updates received: ${
                        data.balance_updates ? data.balance_updates.length : 0
                    } updates`
                );
                break;
            case "error":
                console.error(`❌ Error response: ${data.error}`);
                break;
            default:
                console.log(`📩 Generic response for method: ${method}`);
        }

        // Execute callback if exists
        if (this.requestCallbacks.has(requestId)) {
            const callback = this.requestCallbacks.get(requestId);
            callback(null, message);
            this.requestCallbacks.delete(requestId);
        }
    }

    // Message signer for general RPC operations (not EIP-712)
    async messageSigner(payload) {
        try {
            const message = JSON.stringify(payload);
            const messageBytes = ethers.utils.toUtf8Bytes(message); // UTF-8, not EIP-191
            const signature = await this.sessionKey.signMessage(messageBytes);
            return signature;
        } catch (error) {
            console.error("Message signing failed:", error);
            throw error;
        }
    }

    async sendRequest(method, params = {}, timeout = 5000) {
        if (!this.isAuthenticated) {
            throw new Error("Not authenticated with Yellow ClearNode");
        }

        if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
            throw new Error("WebSocket connection not available");
        }

        return new Promise((resolve, reject) => {
            const requestId = Math.floor(Math.random() * 1000000);

            // Store callback for response
            this.requestCallbacks.set(requestId, (error, response) => {
                if (error) reject(error);
                else resolve(response);
            });

            // Create request message following nitrolite RPC format
            const request = {
                req: [requestId, method, params, Math.floor(Date.now() / 1000)],
            };

            // Send signed request
            this.messageSigner(request.req)
                .then((signature) => {
                    const signedRequest = JSON.stringify({
                        ...request,
                        sig: [signature],
                    });

                    console.log(`📤 Sending RPC request: ${method}`);
                    this.ws.send(signedRequest);
                })
                .catch(reject);

            // Timeout handling
            setTimeout(() => {
                if (this.requestCallbacks.has(requestId)) {
                    this.requestCallbacks.delete(requestId);
                    reject(new Error(`Request timeout: ${method}`));
                }
            }, timeout);
        });
    }

    handleReconnection() {
        if (this.reconnectAttempts < this.maxReconnectAttempts) {
            this.reconnectAttempts++;
            console.log(
                `🔄 Attempting to reconnect to Yellow (${this.reconnectAttempts}/${this.maxReconnectAttempts})`
            );

            setTimeout(() => {
                this.connect().catch((error) => {
                    console.error(
                        `Reconnection attempt ${this.reconnectAttempts} failed:`,
                        error
                    );
                });
            }, this.reconnectDelay * this.reconnectAttempts);
        } else {
            console.error(
                "❌ Max reconnection attempts reached for Yellow ClearNode"
            );
        }
    }

    getConnectionStatus() {
        return {
            connected: !!this.ws && this.ws.readyState === WebSocket.OPEN,
            authenticated: this.isAuthenticated,
            reconnectAttempts: this.reconnectAttempts,
        };
    }

    async disconnect() {
        if (this.ws) {
            this.ws.close();
            this.ws = null;
            this.isAuthenticated = false;
            console.log("🟡 Disconnected from Yellow ClearNode");
        }
    }

    // Get available assets from Yellow Network
    async getAssets() {
        try {
            console.log("📋 Requesting available assets from Yellow Network");
            const response = await this.sendRequest("get_assets", {}, 5000);
            return response.res ? response.res[2] : null;
        } catch (error) {
            console.error("Failed to get assets:", error);
            throw error;
        }
    }

    // Get user's channels
    async getChannels() {
        try {
            console.log("📋 Requesting user channels from Yellow Network");
            const response = await this.sendRequest("get_channels", {}, 5000);
            return response.res ? response.res[2] : null;
        } catch (error) {
            console.error("Failed to get channels:", error);
            throw error;
        }
    }

    // Get balance updates
    async getBalanceUpdates() {
        try {
            console.log("💰 Requesting balance updates from Yellow Network");
            const response = await this.sendRequest(
                "get_balance_updates",
                {},
                5000
            );
            return response.res ? response.res[2] : null;
        } catch (error) {
            console.error("Failed to get balance updates:", error);
            throw error;
        }
    }

    // Health check method
    async healthCheck() {
        try {
            if (!this.isAuthenticated) {
                return {
                    status: "disconnected",
                    error: "Not authenticated",
                    connection: this.ws ? "connected" : "disconnected",
                    authToken: !!this.authToken,
                };
            }

            // Try to get channels as a health check
            await this.getChannels();
            return {
                status: "healthy",
                authenticated: true,
                connection: "connected",
                sessionKey: this.sessionKeyAddress,
                responseTime: Date.now(),
            };
        } catch (error) {
            return {
                status: "unhealthy",
                error: error.message,
                connection: this.ws ? "connected" : "disconnected",
                authenticated: this.isAuthenticated,
            };
        }
    }
}

module.exports = YellowClearNodeConnection;
