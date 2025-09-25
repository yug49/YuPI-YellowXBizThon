const { ethers } = require("ethers");

/**
 * Yellow Contract Integration
 *
 * Handles interactions with Yellow-optimized smart contracts
 * Provides simplified contract operations for state channel integration
 */
class YellowContractIntegration {
    constructor() {
        this.provider = new ethers.JsonRpcProvider(process.env.BASE_RPC_URL);
        this.relayerWallet = new ethers.Wallet(
            process.env.RELAYER_PRIVATE_KEY,
            this.provider
        );

        // Contract instances (will be initialized when contracts are deployed)
        this.orderProtocol = null;
        this.resolverRegistry = null;

        // Contract addresses from environment
        this.orderProtocolAddress = process.env.YELLOW_ORDER_PROTOCOL_ADDRESS;
        this.resolverRegistryAddress =
            process.env.YELLOW_RESOLVER_REGISTRY_ADDRESS;

        // Initialize contracts if addresses are available
        this.initializeContracts();
    }

    /**
     * Initialize contract instances with ABIs
     */
    initializeContracts() {
        try {
            // Yellow Order Protocol ABI (simplified)
            const orderProtocolABI = [
                "function createOrder(bytes32 orderId, address token, uint256 amount, uint256 upiAmount) external",
                "function activateOrder(bytes32 orderId, address resolver, string calldata yellowSessionId) external",
                "function settleOrder(bytes32 orderId) external",
                "function cancelOrder(bytes32 orderId, string calldata reason) external",
                "function getOrder(bytes32 orderId) external view returns (tuple(address maker, address resolver, address token, uint256 amount, uint256 upiAmount, string yellowSessionId, uint8 status, uint256 createdAt, uint256 settledAt))",
                "function addResolver(address resolver) external",
                "function isAuthorizedResolver(address resolver) external view returns (bool)",
                "function getOrderStatus(bytes32 orderId) external view returns (uint8)",
                "function getSettlementTime(bytes32 orderId) external view returns (uint256)",
                "event OrderCreated(bytes32 indexed orderId, address indexed maker, uint256 amount)",
                "event OrderActivated(bytes32 indexed orderId, string yellowSessionId)",
                "event OrderSettled(bytes32 indexed orderId, uint256 settlementTime)",
            ];

            // Yellow Resolver Registry ABI (simplified)
            const resolverRegistryABI = [
                "function registerResolver(address resolverAddress, string calldata endpoint) external",
                "function setMainResolver(address _mainResolver) external",
                "function getMainResolver() external view returns (address)",
                "function isAuthorizedResolver(address resolver) external view returns (bool)",
                "function getResolver(address resolverAddress) external view returns (tuple(address resolverAddress, string endpoint, bool isActive, uint256 totalOrders, uint256 successfulOrders, uint256 registeredAt, uint256 lastActiveAt))",
                "function recordOrderCompletion(address resolverAddress, bool successful) external",
                "function getActiveResolvers() external view returns (address[])",
                "function getSystemMetrics() external view returns (uint256, uint256, bool, uint256)",
                "event ResolverRegistered(address indexed resolver, string endpoint)",
                "event MainResolverSet(address indexed resolver)",
            ];

            // Initialize contracts if addresses are available
            if (this.orderProtocolAddress) {
                this.orderProtocol = new ethers.Contract(
                    this.orderProtocolAddress,
                    orderProtocolABI,
                    this.relayerWallet
                );
                console.log(
                    "✅ Yellow OrderProtocol initialized:",
                    this.orderProtocolAddress
                );
            }

            if (this.resolverRegistryAddress) {
                this.resolverRegistry = new ethers.Contract(
                    this.resolverRegistryAddress,
                    resolverRegistryABI,
                    this.relayerWallet
                );
                console.log(
                    "✅ Yellow ResolverRegistry initialized:",
                    this.resolverRegistryAddress
                );
            }
        } catch (error) {
            console.warn("⚠️ Contract initialization failed:", error.message);
        }
    }

    /**
     * Create order on-chain (simplified for Yellow Network)
     * @param {Object} orderData Order details
     * @returns {Object} Order creation result
     */
    async createOrder(orderData) {
        if (!this.orderProtocol) {
            throw new Error("OrderProtocol contract not initialized");
        }

        try {
            const orderId = ethers.keccak256(
                ethers.toUtf8Bytes(`${orderData.maker}_${Date.now()}`)
            );

            console.log("📄 Creating simplified on-chain order...");
            console.log(`   Order ID: ${orderId}`);
            console.log(`   Maker: ${orderData.maker}`);
            console.log(`   Token: ${orderData.token}`);
            console.log(`   Amount: ${orderData.amount}`);
            console.log(`   UPI Amount: ${orderData.upiAmount}`);

            const tx = await this.orderProtocol.createOrder(
                orderId,
                orderData.token,
                orderData.amount,
                orderData.upiAmount,
                {
                    gasLimit: 150000, // Fixed gas limit for predictability
                    gasPrice: ethers.parseUnits("20", "gwei"), // Optional: set gas price
                }
            );

            const receipt = await tx.wait();
            console.log("✅ Simplified order created:", tx.hash);
            console.log(`   Block: ${receipt.blockNumber}`);
            console.log(`   Gas Used: ${receipt.gasUsed.toString()}`);

            return {
                orderId,
                txHash: tx.hash,
                blockNumber: receipt.blockNumber,
                gasUsed: receipt.gasUsed.toString(),
            };
        } catch (error) {
            console.error("❌ Contract order creation failed:", error);
            throw error;
        }
    }

    /**
     * Activate order with Yellow session
     * @param {string} orderId Order ID
     * @param {string} resolverAddress Resolver address
     * @param {string} yellowSessionId Yellow Network session ID
     * @returns {string} Transaction hash
     */
    async activateOrderWithSession(orderId, resolverAddress, yellowSessionId) {
        if (!this.orderProtocol) {
            throw new Error("OrderProtocol contract not initialized");
        }

        try {
            console.log("⚡ Activating order with Yellow session...");
            console.log(`   Order ID: ${orderId}`);
            console.log(`   Resolver: ${resolverAddress}`);
            console.log(`   Session: ${yellowSessionId}`);

            const tx = await this.orderProtocol.activateOrder(
                orderId,
                resolverAddress,
                yellowSessionId,
                {
                    gasLimit: 100000,
                    gasPrice: ethers.parseUnits("20", "gwei"),
                }
            );

            const receipt = await tx.wait();
            console.log("✅ Order activated with Yellow session:", tx.hash);
            console.log(`   Block: ${receipt.blockNumber}`);

            return tx.hash;
        } catch (error) {
            console.error("❌ Order activation failed:", error);
            throw error;
        }
    }

    /**
     * Settle order after Yellow Network instant settlement
     * @param {string} orderId Order ID
     * @returns {string} Transaction hash
     */
    async settleOrder(orderId) {
        if (!this.orderProtocol) {
            throw new Error("OrderProtocol contract not initialized");
        }

        try {
            console.log("🎯 Settling order on-chain...");
            console.log(`   Order ID: ${orderId}`);

            const tx = await this.orderProtocol.settleOrder(orderId, {
                gasLimit: 80000,
                gasPrice: ethers.parseUnits("20", "gwei"),
            });

            const receipt = await tx.wait();
            console.log("✅ Order settled on-chain:", tx.hash);
            console.log(`   Block: ${receipt.blockNumber}`);

            // Get settlement time for performance metrics
            const settlementTime = await this.getSettlementTime(orderId);
            console.log(`   Settlement Time: ${settlementTime}s`);

            return tx.hash;
        } catch (error) {
            console.error("❌ Order settlement failed:", error);
            throw error;
        }
    }

    /**
     * Get order details from contract
     * @param {string} orderId Order ID
     * @returns {Object} Order details
     */
    async getOrder(orderId) {
        if (!this.orderProtocol) {
            throw new Error("OrderProtocol contract not initialized");
        }

        try {
            const order = await this.orderProtocol.getOrder(orderId);

            return {
                maker: order.maker,
                resolver: order.resolver,
                token: order.token,
                amount: order.amount.toString(),
                upiAmount: order.upiAmount.toString(),
                yellowSessionId: order.yellowSessionId,
                status: order.status,
                createdAt: Number(order.createdAt),
                settledAt: Number(order.settledAt),
            };
        } catch (error) {
            console.error("❌ Failed to get order:", error);
            throw error;
        }
    }

    /**
     * Get settlement time for performance tracking
     * @param {string} orderId Order ID
     * @returns {number} Settlement time in seconds
     */
    async getSettlementTime(orderId) {
        if (!this.orderProtocol) {
            throw new Error("OrderProtocol contract not initialized");
        }

        try {
            const settlementTime = await this.orderProtocol.getSettlementTime(
                orderId
            );
            return Number(settlementTime);
        } catch (error) {
            console.error("❌ Failed to get settlement time:", error);
            return 0;
        }
    }

    /**
     * Register resolver in the registry
     * @param {string} resolverAddress Resolver address
     * @param {string} endpoint Resolver endpoint
     * @returns {string} Transaction hash
     */
    async registerResolver(resolverAddress, endpoint) {
        if (!this.resolverRegistry) {
            throw new Error("ResolverRegistry contract not initialized");
        }

        try {
            console.log("📝 Registering resolver...");
            console.log(`   Address: ${resolverAddress}`);
            console.log(`   Endpoint: ${endpoint}`);

            const tx = await this.resolverRegistry.registerResolver(
                resolverAddress,
                endpoint,
                { gasLimit: 120000 }
            );

            const receipt = await tx.wait();
            console.log("✅ Resolver registered:", tx.hash);

            return tx.hash;
        } catch (error) {
            console.error("❌ Resolver registration failed:", error);
            throw error;
        }
    }

    /**
     * Set main resolver for Yellow Network
     * @param {string} resolverAddress Main resolver address
     * @returns {string} Transaction hash
     */
    async setMainResolver(resolverAddress) {
        if (!this.resolverRegistry) {
            throw new Error("ResolverRegistry contract not initialized");
        }

        try {
            console.log("🎯 Setting main resolver:", resolverAddress);

            const tx = await this.resolverRegistry.setMainResolver(
                resolverAddress,
                {
                    gasLimit: 80000,
                }
            );

            const receipt = await tx.wait();
            console.log("✅ Main resolver set:", tx.hash);

            return tx.hash;
        } catch (error) {
            console.error("❌ Set main resolver failed:", error);
            throw error;
        }
    }

    /**
     * Get main resolver address
     * @returns {string} Main resolver address
     */
    async getMainResolver() {
        if (!this.resolverRegistry) {
            throw new Error("ResolverRegistry contract not initialized");
        }

        try {
            return await this.resolverRegistry.getMainResolver();
        } catch (error) {
            console.error("❌ Failed to get main resolver:", error);
            throw error;
        }
    }

    /**
     * Record order completion for performance tracking
     * @param {string} resolverAddress Resolver address
     * @param {boolean} successful Whether order was successful
     * @returns {string} Transaction hash
     */
    async recordOrderCompletion(resolverAddress, successful) {
        if (!this.resolverRegistry) {
            throw new Error("ResolverRegistry contract not initialized");
        }

        try {
            const tx = await this.resolverRegistry.recordOrderCompletion(
                resolverAddress,
                successful,
                { gasLimit: 60000 }
            );

            await tx.wait();
            return tx.hash;
        } catch (error) {
            console.error("❌ Failed to record order completion:", error);
            // Don't throw - this is not critical
            return null;
        }
    }

    /**
     * Get system metrics for hackathon demo
     * @returns {Object} System metrics
     */
    async getSystemMetrics() {
        if (!this.resolverRegistry) {
            throw new Error("ResolverRegistry contract not initialized");
        }

        try {
            const metrics = await this.resolverRegistry.getSystemMetrics();

            return {
                totalResolvers: Number(metrics[0]),
                activeResolvers: Number(metrics[1]),
                mainResolverSet: metrics[2],
                totalOrdersProcessed: Number(metrics[3]),
            };
        } catch (error) {
            console.error("❌ Failed to get system metrics:", error);
            return {
                totalResolvers: 0,
                activeResolvers: 0,
                mainResolverSet: false,
                totalOrdersProcessed: 0,
            };
        }
    }

    /**
     * Health check for contract connections
     * @returns {Object} Health status
     */
    async healthCheck() {
        try {
            const network = await this.provider.getNetwork();
            const balance = await this.provider.getBalance(
                this.relayerWallet.address
            );

            return {
                status: "healthy",
                network: {
                    name: network.name,
                    chainId: Number(network.chainId),
                },
                relayerBalance: ethers.formatEther(balance),
                contractsInitialized: {
                    orderProtocol: !!this.orderProtocol,
                    resolverRegistry: !!this.resolverRegistry,
                },
                addresses: {
                    orderProtocol: this.orderProtocolAddress,
                    resolverRegistry: this.resolverRegistryAddress,
                },
            };
        } catch (error) {
            return {
                status: "unhealthy",
                error: error.message,
            };
        }
    }
}

module.exports = YellowContractIntegration;
