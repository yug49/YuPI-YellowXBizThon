/**
 * Yellow Network Resolver Client - Fixed Version
 * 
 * Integrates resolver bot with Yellow Network for instant settlements
 */

const {
    createAuthRequestMessage,
    createAuthVerifyMessageFromChallenge,
    createEIP712AuthMessageSigner
} = require("@erc7824/nitrolite");
const WebSocket = require("ws");
const { ethers } = require("ethers");
const { createWalletClient, http } = require("viem");
const { privateKeyToAccount } = require("viem/accounts");
const { mainnet } = require("viem/chains");
 * 
 * Integrates resolver bot with Yellow Network for instant settlements
 */

const {
    createAuthRequestMessage,
    createAuthVerifyMessageFromChallenge,
    createEIP712AuthMessageSigner
} = require("@erc7824/nitrolite");
const WebSocket = require("ws");
const { ethers } = require("ethers");

class YellowResolverClient {
    constructor(wallet, options = {}) {
        this.wallet = wallet;
        this.clearNodeUrl = options.clearNodeUrl || process.env.YELLOW_CLEARNODE_URL;
        this.appName = options.appName || process.env.YELLOW_APP_NAME || "YuPI";
        this.application = options.application || process.env.CONTRACT_ADDRESS;
        this.ws = null;
        this.authenticated = false;
        this.sessionKey = null;
        
        // Generate session key
        this.sessionKey = ethers.Wallet.createRandom();
        console.log(`🔑 Generated session key: ${this.sessionKey.address}`);
        
        // Create viem wallet client for EIP-712 signing using main wallet (not session key)
        const account = privateKeyToAccount(this.wallet.privateKey);
        this.viemWalletClient = createWalletClient({
            account,
            chain: mainnet,
            transport: http(),
        });
    }

    async connect() {
        return new Promise((resolve, reject) => {
            try {
                console.log("🟡 Connecting to Yellow Network ClearNode...");
                this.ws = new WebSocket(this.clearNodeUrl);

                this.ws.onopen = async () => {
                    console.log("✅ Connected to Yellow ClearNode");
                    await this.authenticate();
                    resolve();
                };

                this.ws.onmessage = this.handleMessage.bind(this);

                this.ws.onerror = (error) => {
                    console.error("❌ Yellow WebSocket error:", error);
                    reject(error);
                };

                this.ws.onclose = (event) => {
                    console.log("🔌 Yellow WebSocket closed:", event.code);
                    this.authenticated = false;
                };

            } catch (error) {
                console.error("Connection error:", error);
                reject(error);
            }
        });
    }

    async authenticate() {
        try {
            console.log("🔐 Authenticating with Yellow Network...");
            
            const expire = Math.floor(Date.now() / 1000) + 3600; // 1 hour from now
            const authParams = {
                address: this.wallet.address,
                session_key: this.sessionKey.address,
                app_name: this.appName,
                application: this.application,
                allowances: [],
                expire: expire.toString(),
                scope: "console"
            };

            const authRequest = await createAuthRequestMessage(authParams);
            console.log("📤 Sent auth request to Yellow ClearNode");
            this.ws.send(authRequest);
            
        } catch (error) {
            console.error("Authentication failed:", error);
            throw error;
        }
    }

    async handleMessage(event) {
        try {
            console.log("📨 Raw message from Yellow ClearNode:", event.data);
            
            let message;
            try {
                message = JSON.parse(event.data);
            } catch (parseError) {
                console.error("Failed to parse message as JSON:", parseError);
                return;
            }

            console.log("📩 Parsed message:", message);

            // Check message type and handle accordingly
            if (message.res && message.res[1] === "auth_challenge") {
                console.log("🔑 Received auth challenge");
                await this.handleAuthChallenge(message);
            } else if (message.res && message.res[1] === "auth_verify") {
                console.log("🎯 Received auth verify result");
                this.handleAuthResult(message);
            } else if (message.res && message.res[1] === "assets") {
                console.log("💎 Received assets:", message.res[2].assets ? message.res[2].assets.length : 0, "assets");
            } else if (message.res && message.res[1] === "channels") {
                console.log("🔗 Received channels:", message.res[2].channels ? message.res[2].channels.length : 0, "channels");
            } else if (message.res && message.res[1] === "bu") {
                console.log("💰 Balance updates received:", message.res[2].balance_updates ? message.res[2].balance_updates.length : 0, "updates");
            } else {
                console.log("📩 Other message type received:", message.res ? message.res[1] : "unknown");
            }
        } catch (error) {
            console.error("❌ Message handling error:", error);
        }
    }

    async handleAuthChallenge(message) {
        try {
            console.log("🔑 Handling auth challenge from Yellow ClearNode");
            const challengeData = message.res[2];
            console.log("🎯 Challenge data:", challengeData);
            
            const challengeUuid = challengeData.challenge_message;
            console.log("🔑 Challenge UUID:", challengeUuid);
            
            // Create EIP-712 message for signing (matches backend implementation)
            const expireTimestamp = Math.floor(Date.now() / 1000) + 3600; // 1 hour from now
            const partialMessage = {
                scope: "console",
                application: this.application,
                participant: this.sessionKey.address,
                expire: expireTimestamp.toString(),
                allowances: []
            };
            
            const domain = {
                name: this.appName
            };
            
            console.log("🔍 EIP-712 partial message:", partialMessage);
            console.log("🔍 EIP-712 domain:", domain);
            
            // Create EIP-712 message signer using viem wallet client (like backend)
            const eip712MessageSigner = createEIP712AuthMessageSigner(
                this.viemWalletClient, // Use viem wallet client
                partialMessage, // Partial message structure
                domain // Domain structure
            );

            // Create auth verify message using challenge UUID (like backend)
            const authVerifyMsg = await createAuthVerifyMessageFromChallenge(
                eip712MessageSigner,
                challengeUuid
            );
            
            console.log("📤 Sending auth verify to Yellow ClearNode");
            this.ws.send(authVerifyMsg);
            
        } catch (error) {
            console.error("Auth challenge handling failed:", error);
        }
    }

    handleAuthResult(message) {
        try {
            const authData = message.res[2];
            console.log("📩 Auth result:", authData);
            
            if (authData.success) {
                console.log("✅ Yellow Network authentication successful!");
                this.authenticated = true;
            } else {
                console.error("❌ Yellow Network authentication failed");
            }
        } catch (error) {
            console.error("Auth result handling failed:", error);
        }
    }

    async createTripartiteSession(orderId, resolverAddress, orderDetails) {
        // Placeholder for session creation
        console.log(`🟡 Creating Yellow Network session for order ${orderId}`);
        return {
            sessionId: `yellow_${orderId}_${Date.now()}`,
            participants: [this.wallet.address, resolverAddress],
            orderDetails
        };
    }

    async instantSettlement(orderId, paymentProof, orderDetails) {
        // Placeholder for instant settlement
        console.log(`⚡ Yellow Network instant settlement for order ${orderId}`);
        return {
            success: true,
            settlementTime: "~3 seconds",
            sessionCompleted: true
        };
    }

    healthCheck() {
        return {
            connected: this.ws && this.ws.readyState === WebSocket.OPEN,
            authenticated: this.authenticated,
            sessionKey: this.sessionKey ? this.sessionKey.address : null
        };
    }

    disconnect() {
        if (this.ws) {
            this.ws.close();
            this.ws = null;
        }
        this.authenticated = false;
    }
}

module.exports = YellowResolverClient;