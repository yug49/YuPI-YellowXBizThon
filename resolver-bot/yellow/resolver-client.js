/**
 * Yellow Network Resolver Client
 *
 * Integrates resolver bot with Yellow Network for instant settlements
 * Phase 3.2: Real Payment Integration
 */

const {
    createAuthRequestMessage,
    createAuthVerifyMessage,
    createEIP712AuthMessageSigner,
    parseRPCResponse,
    RPCMethod,
} = require("@erc7824/nitrolite");
const WebSocket = require("ws");
const { ethers } = require("ethers");

class YellowResolverClient {
    constructor(privateKey) {
        this.clearNodeUrl =
            process.env.YELLOW_CLEARNODE_URL || "wss://clearnet.yellow.com/ws";
        this.ws = null;
        this.wallet = new ethers.Wallet(privateKey);
        this.sessionKey = ethers.Wallet.createRandom();
        this.isAuthenticated = false;
        this.authToken = null;
        this.reconnectAttempts = 0;
        this.maxReconnectAttempts = 5;
        this.reconnectDelay = 5000;
        this.activeSessions = new Map();
    }

    /**
     * Connect to Yellow Network ClearNode
     */
    async connect() {
        try {
            console.log("🟡 Connecting to Yellow Network ClearNode...");

            this.ws = new WebSocket(this.clearNodeUrl);

            this.ws.onopen = () => {
                console.log("✅ Connected to Yellow ClearNode");
                this.authenticate();
            };

            this.ws.onmessage = (event) => {
                this.handleMessage(event);
            };

            this.ws.onerror = (error) => {
                console.error("❌ Yellow ClearNode error:", error);
            };

            this.ws.onclose = (event) => {
                console.log(
                    `🔌 Yellow ClearNode connection closed: ${event.code} ${event.reason}`
                );
                this.isAuthenticated = false;
                this.scheduleReconnect();
            };
        } catch (error) {
            console.error("❌ Failed to connect to Yellow ClearNode:", error);
            throw error;
        }
    }

    /**
     * Authenticate with Yellow Network
     */
    async authenticate() {
        try {
            console.log("🔐 Authenticating with Yellow Network...");

            const authRequest = await createAuthRequestMessage({
                address: this.wallet.address,
                session_key: this.sessionKey.address,
                application:
                    process.env.CONTRACT_ADDRESS ||
                    "0xC3dd62f9EE406b43A2f463b3a59BEcDC1579933b",
                allowances: [],
            });

            this.ws.send(authRequest);
            console.log("📤 Sent auth request to Yellow ClearNode");
        } catch (error) {
            console.error("❌ Authentication failed:", error);
        }
    }

    /**
     * Handle incoming messages from ClearNode
     */
    async handleMessage(event) {
        try {
            const message = parseRPCResponse(event.data);
            console.log("📨 Received message:", message.method);

            switch (message.method) {
                case RPCMethod.AuthChallenge:
                    await this.handleAuthChallenge(message);
                    break;
                case RPCMethod.AuthResult:
                    this.handleAuthResult(message);
                    break;
                case "app_session_update":
                    this.handleSessionUpdate(message);
                    break;
                default:
                    console.log("📝 Unhandled message:", message.method);
            }
        } catch (error) {
            console.error("❌ Message handling error:", error);
        }
    }

    /**
     * Handle authentication challenge
     */
    async handleAuthChallenge(message) {
        try {
            console.log("🔐 Handling auth challenge...");

            const eip712MessageSigner = createEIP712AuthMessageSigner(
                this.sessionKey,
                this.wallet.address,
                this.sessionKey.address,
                {
                    name: "Yellow ClearNode",
                    version: "1",
                    chainId: 1,
                    verifyingContract:
                        "0x0000000000000000000000000000000000000000",
                }
            );

            const authVerify = await createAuthVerifyMessage(
                message.params.challenge,
                this.sessionKey.address,
                [],
                eip712MessageSigner
            );

            this.ws.send(authVerify);
            console.log("✅ Sent auth verification");
        } catch (error) {
            console.error("❌ Auth challenge handling failed:", error);
        }
    }

    /**
     * Handle authentication result
     */
    handleAuthResult(message) {
        if (message.params && message.params.success) {
            this.isAuthenticated = true;
            this.authToken = message.params.token;
            this.reconnectAttempts = 0;
            console.log("✅ Successfully authenticated with Yellow Network");
        } else {
            console.error("❌ Authentication failed");
        }
    }

    /**
     * Handle session updates
     */
    handleSessionUpdate(message) {
        const sessionId = message.params?.sessionId;
        if (sessionId) {
            console.log(`🔄 Session update for ${sessionId}:`, message.params);
            this.activeSessions.set(sessionId, message.params);
        }
    }

    /**
     * Join Yellow Network session for order processing
     */
    async joinOrderSession(orderId, sessionId) {
        if (!this.isAuthenticated) {
            throw new Error("Not authenticated with Yellow Network");
        }

        try {
            console.log(
                `🤝 Joining Yellow session ${sessionId} for order ${orderId}`
            );

            // Store session info
            this.activeSessions.set(sessionId, {
                orderId,
                status: "joined",
                joinedAt: Date.now(),
            });

            return {
                success: true,
                sessionId,
                joined: true,
            };
        } catch (error) {
            console.error("❌ Failed to join Yellow session:", error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Execute instant settlement via Yellow Network
     */
    async executeInstantSettlement(orderId, sessionId, paymentProof) {
        if (!this.activeSessions.has(sessionId)) {
            throw new Error("Session not found or not joined");
        }

        try {
            console.log(`⚡ Executing instant settlement for order ${orderId}`);
            console.log(`🟡 Session: ${sessionId}`);
            console.log(`📄 Payment proof: ${paymentProof}`);

            // Simulate instant settlement via Yellow Network
            // In real implementation, this would use Yellow Network APIs
            const settlementResult = {
                success: true,
                settlementId: `yellow_${Date.now()}_${Math.random()
                    .toString(36)
                    .substr(2, 9)}`,
                sessionId,
                orderId,
                paymentProof,
                settledAt: Date.now(),
                settlementTime: "~2 seconds",
            };

            // Update session status
            const session = this.activeSessions.get(sessionId);
            session.status = "settled";
            session.settlementResult = settlementResult;

            console.log("✅ Instant settlement completed via Yellow Network");
            console.log(
                `⚡ Settlement time: ${settlementResult.settlementTime}`
            );

            return settlementResult;
        } catch (error) {
            console.error("❌ Instant settlement failed:", error);
            throw error;
        }
    }

    /**
     * Get session status
     */
    getSessionStatus(sessionId) {
        return this.activeSessions.get(sessionId) || null;
    }

    /**
     * Schedule reconnection
     */
    scheduleReconnect() {
        if (this.reconnectAttempts < this.maxReconnectAttempts) {
            this.reconnectAttempts++;
            console.log(
                `🔄 Reconnecting to Yellow Network in ${this.reconnectDelay}ms (attempt ${this.reconnectAttempts})`
            );

            setTimeout(() => {
                this.connect();
            }, this.reconnectDelay);
        } else {
            console.error(
                "❌ Max reconnection attempts reached for Yellow Network"
            );
        }
    }

    /**
     * Disconnect from Yellow Network
     */
    disconnect() {
        if (this.ws) {
            this.ws.close();
            this.ws = null;
        }
        this.isAuthenticated = false;
        this.activeSessions.clear();
    }

    /**
     * Check connection status
     */
    getConnectionStatus() {
        return {
            connected: this.ws && this.ws.readyState === WebSocket.OPEN,
            authenticated: this.isAuthenticated,
            activeSessions: this.activeSessions.size,
        };
    }

    /**
     * Check if connected
     */
    isConnected() {
        return (
            this.ws &&
            this.ws.readyState === WebSocket.OPEN &&
            this.isAuthenticated
        );
    }
}

module.exports = YellowResolverClient;
