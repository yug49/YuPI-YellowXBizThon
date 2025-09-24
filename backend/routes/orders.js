const express = require("express");
const router = express.Router();
const Order = require("../models/Order");
const axios = require("axios");
const {
    createWalletClient,
    http,
    parseEther,
    parseGwei,
    createPublicClient,
} = require("viem");
const { privateKeyToAccount } = require("viem/accounts");

// Store resolver callbacks (in production, use Redis or database)
const resolverCallbacks = new Map();

/**
 * Register a resolver callback endpoint
 * @param {string} resolverAddress - The resolver's address
 * @param {string} callbackUrl - The callback URL
 */
function registerResolverCallback(resolverAddress, callbackUrl) {
    const normalizedAddress = resolverAddress.toLowerCase();
    resolverCallbacks.set(normalizedAddress, callbackUrl);
    console.log(
        `📡 Registered callback for resolver ${resolverAddress} (normalized: ${normalizedAddress}): ${callbackUrl}`
    );
    console.log(`📊 Total registered callbacks: ${resolverCallbacks.size}`);
    console.log(
        `📋 All registered resolvers:`,
        Array.from(resolverCallbacks.keys())
    );
}

/**
 * Signal resolver that their order was accepted
 * @param {string} orderId - The order ID
 * @param {string} resolverAddress - The resolver's address
 * @param {Object} details - Additional details about the acceptance
 */
async function signalResolverOrderAccepted(orderId, resolverAddress, details) {
    try {
        const normalizedAddress = resolverAddress.toLowerCase();
        console.log(
            `🔍 Looking up callback for resolver ${resolverAddress} (normalized: ${normalizedAddress})`
        );
        console.log(
            `📊 Currently registered callbacks: ${resolverCallbacks.size}`
        );
        console.log(
            `📋 Registered resolvers:`,
            Array.from(resolverCallbacks.keys())
        );

        const callbackUrl = resolverCallbacks.get(normalizedAddress);

        if (!callbackUrl) {
            console.log(
                `❌ No callback registered for resolver ${resolverAddress} (normalized: ${normalizedAddress})`
            );
            return;
        }

        const signalPayload = {
            type: "ORDER_ACCEPTED",
            orderId,
            resolverAddress,
            timestamp: new Date().toISOString(),
            details,
        };

        console.log(
            `📡 Signaling resolver ${resolverAddress} about order ${orderId}...`
        );

        await axios.post(callbackUrl, signalPayload, {
            timeout: 5000,
            headers: {
                "Content-Type": "application/json",
            },
        });

        console.log(`✅ Successfully signaled resolver ${resolverAddress}`);
    } catch (error) {
        console.error(
            `❌ Failed to signal resolver ${resolverAddress}:`,
            error.message
        );
        throw error;
    }
}

// Define Worldchain Sepolia chain
const worldchainSepolia = {
    id: 4801,
    name: "Worldchain Sepolia",
    network: "worldchain-sepolia",
    nativeCurrency: {
        decimals: 18,
        name: "Ether",
        symbol: "ETH",
    },
    rpcUrls: {
        default: {
            http: [
                "https://worldchain-sepolia.g.alchemy.com/v2/ydzpyjQ8ltFGNlU9MwB0q",
            ],
        },
        public: {
            http: [
                "https://worldchain-sepolia.g.alchemy.com/v2/ydzpyjQ8ltFGNlU9MwB0q",
            ],
        },
    },
};

// Validation middleware
const validateWalletAddress = (req, res, next) => {
    const walletAddress =
        req.body?.walletAddress ||
        req.params?.address ||
        req.params?.walletAddress;
    if (!walletAddress || !/^0x[a-fA-F0-9]{40}$/.test(walletAddress)) {
        return res.status(400).json({
            error: "Invalid wallet address format",
            message: "Wallet address must be a valid Ethereum address (0x...)",
        });
    }
    next();
};

const validateOrderData = (req, res, next) => {
    const {
        orderId,
        amount,
        tokenAddress,
        startPrice,
        endPrice,
        recipientUpiAddress,
        transactionHash,
        blockNumber,
    } = req.body;

    const errors = [];

    if (!orderId || typeof orderId !== "string") {
        errors.push("orderId is required and must be a string");
    }

    if (!amount || typeof amount !== "string") {
        errors.push("amount is required and must be a string");
    }

    if (!tokenAddress || !/^0x[a-fA-F0-9]{40}$/.test(tokenAddress)) {
        errors.push("tokenAddress must be a valid Ethereum address");
    }

    if (!startPrice || typeof startPrice !== "string") {
        errors.push("startPrice is required and must be a string");
    }

    if (!endPrice || typeof endPrice !== "string") {
        errors.push("endPrice is required and must be a string");
    }

    if (
        !recipientUpiAddress ||
        typeof recipientUpiAddress !== "string" ||
        recipientUpiAddress.trim().length === 0
    ) {
        errors.push(
            "recipientUpiAddress is required and must be a non-empty string"
        );
    }

    if (!transactionHash || !/^0x[a-fA-F0-9]{64}$/.test(transactionHash)) {
        errors.push("transactionHash must be a valid transaction hash");
    }

    if (!blockNumber || typeof blockNumber !== "number" || blockNumber < 0) {
        errors.push("blockNumber is required and must be a positive number");
    }

    if (errors.length > 0) {
        return res.status(400).json({
            error: "Validation failed",
            messages: errors,
        });
    }

    next();
};

// POST /api/orders/resolver/register - Register resolver callback endpoint
router.post("/resolver/register", async (req, res) => {
    try {
        const { resolverAddress, callbackUrl } = req.body;

        if (!resolverAddress || !/^0x[a-fA-F0-9]{40}$/.test(resolverAddress)) {
            return res.status(400).json({
                error: "Invalid resolverAddress",
                message: "resolverAddress must be a valid Ethereum address",
            });
        }

        if (!callbackUrl || typeof callbackUrl !== "string") {
            return res.status(400).json({
                error: "Invalid callbackUrl",
                message: "callbackUrl is required and must be a string",
            });
        }

        // Validate URL format
        try {
            new URL(callbackUrl);
        } catch (e) {
            return res.status(400).json({
                error: "Invalid callbackUrl",
                message: "callbackUrl must be a valid URL",
            });
        }

        registerResolverCallback(resolverAddress, callbackUrl);

        res.json({
            success: true,
            message: "Resolver callback registered successfully",
            data: {
                resolverAddress,
                callbackUrl,
            },
        });
    } catch (error) {
        console.error("Error registering resolver callback:", error);
        res.status(500).json({
            error: "Failed to register resolver callback",
            message: "An internal server error occurred",
        });
    }
});

// POST /api/orders - Create a new order record
router.post("/", validateWalletAddress, validateOrderData, async (req, res) => {
    try {
        const {
            orderId,
            walletAddress,
            amount,
            tokenAddress,
            startPrice,
            endPrice,
            recipientUpiAddress,
            transactionHash,
            blockNumber,
        } = req.body;

        // Check if order already exists
        const existingOrder = await Order.findByOrderId(orderId);
        if (existingOrder) {
            return res.status(409).json({
                error: "Order already exists",
                message: `Order with ID ${orderId} already exists in database`,
            });
        }

        // Check if transaction hash already exists
        const existingTx = await Order.findOne({ transactionHash });
        if (existingTx) {
            return res.status(409).json({
                error: "Transaction already recorded",
                message: `Order with transaction hash ${transactionHash} already exists`,
            });
        }

        // Create new order
        const newOrder = new Order({
            orderId,
            walletAddress: walletAddress.toLowerCase(),
            amount,
            tokenAddress: tokenAddress.toLowerCase(),
            startPrice,
            endPrice,
            recipientUpiAddress: recipientUpiAddress.trim(),
            transactionHash,
            blockNumber,
        });

        await newOrder.save();

        res.status(201).json({
            success: true,
            message: "Order created successfully",
            data: newOrder.toFormattedJSON(),
        });
    } catch (error) {
        console.error("Error creating order:", error);

        if (error.code === 11000) {
            // Duplicate key error
            const field = Object.keys(error.keyPattern)[0];
            return res.status(409).json({
                error: "Duplicate entry",
                message: `An order with this ${field} already exists`,
            });
        }

        res.status(500).json({
            error: "Failed to create order",
            message: "An internal server error occurred",
        });
    }
});

// GET /api/orders/wallet/:address - Get all orders for a wallet address
router.get("/wallet/:address", validateWalletAddress, async (req, res) => {
    try {
        const { address } = req.params;
        const { status, limit = 50, skip = 0 } = req.query;

        const options = {
            limit: Math.min(parseInt(limit), 100), // Max 100 orders per request
            skip: parseInt(skip) || 0,
        };

        if (
            status &&
            [
                "created",
                "auction_active",
                "accepted",
                "fulfilled",
                "failed",
            ].includes(status)
        ) {
            options.status = status;
        }

        const orders = await Order.findByWallet(address, options);
        const totalOrders = await Order.countDocuments({
            walletAddress: address.toLowerCase(),
            ...(options.status && { status: options.status }),
        });

        res.json({
            success: true,
            data: {
                orders: orders.map((order) => order.toFormattedJSON()),
                pagination: {
                    total: totalOrders,
                    limit: options.limit,
                    skip: options.skip,
                    hasMore: totalOrders > options.skip + options.limit,
                },
            },
        });
    } catch (error) {
        console.error("Error fetching orders:", error);
        res.status(500).json({
            error: "Failed to fetch orders",
            message: "An internal server error occurred",
        });
    }
});

// GET /api/orders/:orderId - Get a specific order by orderId
router.get("/:orderId", async (req, res) => {
    try {
        const { orderId } = req.params;

        if (!orderId) {
            return res.status(400).json({
                error: "Order ID is required",
            });
        }

        const order = await Order.findByOrderId(orderId);

        if (!order) {
            return res.status(404).json({
                error: "Order not found",
                message: `No order found with ID ${orderId}`,
            });
        }

        res.json({
            success: true,
            data: order.toFormattedJSON(),
        });
    } catch (error) {
        console.error("Error fetching order:", error);
        res.status(500).json({
            error: "Failed to fetch order",
            message: "An internal server error occurred",
        });
    }
});

// PUT /api/orders/:orderId/status - Update order status
router.put("/:orderId/status", async (req, res) => {
    try {
        const { orderId } = req.params;
        const { status } = req.body;

        if (
            ![
                "created",
                "auction_active",
                "accepted",
                "fulfilled",
                "failed",
            ].includes(status)
        ) {
            return res.status(400).json({
                error: "Invalid status",
                message:
                    "Status must be one of: created, auction_active, accepted, fulfilled, failed",
            });
        }

        const order = await Order.findByOrderId(orderId);

        if (!order) {
            return res.status(404).json({
                error: "Order not found",
                message: `No order found with ID ${orderId}`,
            });
        }

        order.status = status;
        await order.save();

        res.json({
            success: true,
            message: "Order status updated successfully",
            data: order.toFormattedJSON(),
        });
    } catch (error) {
        console.error("Error updating order status:", error);
        res.status(500).json({
            error: "Failed to update order status",
            message: "An internal server error occurred",
        });
    }
});

// GET /api/orders/stats/:address - Get order statistics for a wallet
router.get("/stats/:address", validateWalletAddress, async (req, res) => {
    try {
        const { address } = req.params;

        const stats = await Order.aggregate([
            { $match: { walletAddress: address.toLowerCase() } },
            {
                $group: {
                    _id: "$status",
                    count: { $sum: 1 },
                },
            },
        ]);

        const totalOrders = await Order.countDocuments({
            walletAddress: address.toLowerCase(),
        });

        const formattedStats = {
            total: totalOrders,
            created: 0,
            accepted: 0,
            fulfilled: 0,
            failed: 0,
        };

        stats.forEach((stat) => {
            formattedStats[stat._id] = stat.count;
        });

        res.json({
            success: true,
            data: formattedStats,
        });
    } catch (error) {
        console.error("Error fetching order stats:", error);
        res.status(500).json({
            error: "Failed to fetch order statistics",
            message: "An internal server error occurred",
        });
    }
});

// POST /api/orders/:orderId/accept - Accept an order (called by resolver)
router.post("/:orderId/accept", async (req, res) => {
    try {
        const { orderId } = req.params;
        const { acceptedPrice, resolverAddress } = req.body;

        // Check if order is in Dutch auction
        const auctionManager = req.app.get("auctionManager");
        const activeAuction = auctionManager.getActiveAuction(orderId);

        if (activeAuction && activeAuction.isActive) {
            // Accept the Dutch auction
            const auctionResult = auctionManager.acceptAuction(
                orderId,
                parseFloat(acceptedPrice)
            );

            if (!auctionResult.success) {
                return res.status(400).json({
                    error: "Failed to accept auction",
                    message: auctionResult.message,
                });
            }

            // Emit Socket.IO event for auction acceptance (no database update needed)
            const io = req.app.get("io");
            if (io) {
                io.emit("orderAccepted", {
                    orderId,
                    acceptedPrice,
                    resolverAddress,
                    timestamp: new Date(),
                });
            }
        }

        // Validate input
        if (!acceptedPrice || typeof acceptedPrice !== "string") {
            return res.status(400).json({
                error: "Invalid acceptedPrice",
                message: "acceptedPrice is required and must be a string",
            });
        }

        // Convert price to BigInt (wei format)
        let acceptedPriceWei;
        try {
            const priceFloat = parseFloat(acceptedPrice);

            // Check if price is already in wei format (very large number) or decimal format
            if (priceFloat > 1e15) {
                // Price is already in wei format (e.g., 85623053138257490432)
                acceptedPriceWei = BigInt(acceptedPrice);
                console.log(
                    `✅ Price already in wei format: ${acceptedPriceWei.toString()}`
                );
            } else {
                // Price is in decimal format (e.g., 90.5), convert to wei
                acceptedPriceWei = BigInt(Math.floor(priceFloat * 1e18));
                console.log(
                    `✅ Price converted from decimal to wei: ${priceFloat} → ${acceptedPriceWei.toString()}`
                );
            }
        } catch (error) {
            return res.status(400).json({
                error: "Invalid acceptedPrice format",
                message: "acceptedPrice must be a valid number",
            });
        }

        if (!resolverAddress || !/^0x[a-fA-F0-9]{40}$/.test(resolverAddress)) {
            return res.status(400).json({
                error: "Invalid resolverAddress",
                message: "resolverAddress must be a valid Ethereum address",
            });
        }

        // Read order details from blockchain only (no database involvement)
        let orderStartPrice, orderEndPrice;
        try {
            console.log(`📋 Reading order ${orderId} from blockchain...`);

            const { createPublicClient, http } = require("viem");
            const { worldchainSepolia } = require("viem/chains");

            const rpcUrl =
                process.env.RPC_URL ||
                "https://worldchain-sepolia.g.alchemy.com/v2/ydzpyjQ8ltFGNlU9MwB0q";
            const contractAddress =
                process.env.CONTRACT_ADDRESS ||
                "0xC3dd62f9EE406b43A2f463b3a59BEcDC1579933b";

            const publicClient = createPublicClient({
                chain: worldchainSepolia,
                transport: http(rpcUrl),
            });

            const contractABI = [
                {
                    inputs: [
                        {
                            internalType: "bytes32",
                            name: "_orderId",
                            type: "bytes32",
                        },
                    ],
                    name: "getOrder",
                    outputs: [
                        {
                            components: [
                                {
                                    internalType: "address",
                                    name: "maker",
                                    type: "address",
                                },
                                {
                                    internalType: "address",
                                    name: "taker",
                                    type: "address",
                                },
                                {
                                    internalType: "string",
                                    name: "recipientUpiAddress",
                                    type: "string",
                                },
                                {
                                    internalType: "uint256",
                                    name: "amount",
                                    type: "uint256",
                                },
                                {
                                    internalType: "address",
                                    name: "token",
                                    type: "address",
                                },
                                {
                                    internalType: "uint256",
                                    name: "startPrice",
                                    type: "uint256",
                                },
                                {
                                    internalType: "uint256",
                                    name: "acceptedPrice",
                                    type: "uint256",
                                },
                                {
                                    internalType: "uint256",
                                    name: "endPrice",
                                    type: "uint256",
                                },
                                {
                                    internalType: "uint256",
                                    name: "startTime",
                                    type: "uint256",
                                },
                                {
                                    internalType: "uint256",
                                    name: "acceptedTime",
                                    type: "uint256",
                                },
                                {
                                    internalType: "bool",
                                    name: "accepted",
                                    type: "bool",
                                },
                                {
                                    internalType: "bool",
                                    name: "fullfilled",
                                    type: "bool",
                                },
                            ],
                            internalType: "struct OrderProtocol.Order",
                            name: "",
                            type: "tuple",
                        },
                    ],
                    stateMutability: "view",
                    type: "function",
                },
            ];

            const blockchainOrder = await publicClient.readContract({
                address: contractAddress,
                abi: contractABI,
                functionName: "getOrder",
                args: [orderId],
            });

            console.log(`🔍 Raw blockchain order data:`, blockchainOrder);
            console.log(`🔍 Order type:`, typeof blockchainOrder);
            console.log(`🔍 Order.maker:`, blockchainOrder.maker);
            console.log(`🔍 Order.startPrice:`, blockchainOrder.startPrice);
            console.log(`🔍 Order.endPrice:`, blockchainOrder.endPrice);

            // Check if order exists (maker is not zero address)
            if (
                !blockchainOrder.maker ||
                blockchainOrder.maker ===
                    "0x0000000000000000000000000000000000000000"
            ) {
                return res.status(404).json({
                    error: "Order not found",
                    message: `Order with ID ${orderId} does not exist on blockchain`,
                });
            }

            // Check if order is already accepted
            if (blockchainOrder.accepted) {
                // accepted field
                return res.status(400).json({
                    error: "Order already accepted",
                    message: `Order ${orderId} has already been accepted`,
                });
            }

            // Ensure we have valid price data before proceeding
            if (!blockchainOrder.startPrice || !blockchainOrder.endPrice) {
                console.error(
                    `❌ Missing price data - startPrice: ${blockchainOrder.startPrice}, endPrice: ${blockchainOrder.endPrice}`
                );
                return res.status(500).json({
                    error: "Invalid order data",
                    message: "Order price data is missing or invalid",
                });
            }

            orderStartPrice = blockchainOrder.startPrice; // startPrice
            orderEndPrice = blockchainOrder.endPrice; // endPrice
            console.log(`✅ Order found on blockchain - Status: Active`);
            console.log(`   Maker: ${blockchainOrder.maker}`);
            console.log(
                `   Amount: ${
                    blockchainOrder.amount?.toString() || "undefined"
                }`
            );
            console.log(`   Token: ${blockchainOrder.token}`);
            console.log(`   Start Price: ${orderStartPrice.toString()}`);
            console.log(`   End Price: ${orderEndPrice.toString()}`);
            console.log(`   Accepted: ${blockchainOrder.accepted}`);
            console.log(`   Fulfilled: ${blockchainOrder.fulfilled}`);

            console.log(`🔍 Price validation:`);
            console.log(
                `   Order range: ${orderEndPrice.toString()} ≤ price ≤ ${orderStartPrice.toString()}`
            );
            console.log(`   Accepted price: ${acceptedPriceWei.toString()}`);

            // Smart contract validates: endPrice <= acceptedPrice <= startPrice
            if (
                acceptedPriceWei < orderEndPrice ||
                acceptedPriceWei > orderStartPrice
            ) {
                return res.status(400).json({
                    error: "Price out of range",
                    message: `Accepted price ${acceptedPriceWei.toString()} must be between ${orderEndPrice.toString()} and ${orderStartPrice.toString()}`,
                });
            }

            console.log(`✅ Price validation passed!`);
        } catch (validationError) {
            console.error(`❌ Price validation error:`, validationError);
            if (validationError.message?.includes("OrderNotFound")) {
                return res.status(404).json({
                    error: "Order not found",
                    message: `Order with ID ${orderId} does not exist on blockchain`,
                });
            }
            return res.status(500).json({
                error: "Price validation failed",
                message: validationError.message,
            });
        }

        console.log(
            `Relayer accepting order ${orderId} at price ${acceptedPrice} for resolver ${resolverAddress}`
        );

        // Set up blockchain connection with relayer's private key using viem
        const rpcUrl =
            process.env.RPC_URL ||
            "https://worldchain-sepolia.g.alchemy.com/v2/ydzpyjQ8ltFGNlU9MwB0q";
        const relayerPrivateKey =
            process.env.RELAYER_PRIVATE_KEY ||
            "6c1db0c528e7cac4202419249bc98d3df647076707410041e32f6e9080906bfb";
        const contractAddress =
            process.env.CONTRACT_ADDRESS ||
            "0xC3dd62f9EE406b43A2f463b3a59BEcDC1579933b";

        // Create account from private key
        const account = privateKeyToAccount(`0x${relayerPrivateKey}`);

        // Create public client for reading blockchain data
        const publicClient = createPublicClient({
            chain: worldchainSepolia,
            transport: http(rpcUrl),
        });

        // Create wallet client for sending transactions
        const walletClient = createWalletClient({
            account,
            chain: worldchainSepolia,
            transport: http(rpcUrl),
        });

        // OrderProtocol contract ABI (minimal - just the acceptOrder function)
        const contractABI = [
            {
                inputs: [
                    {
                        internalType: "bytes32",
                        name: "_orderId",
                        type: "bytes32",
                    },
                    {
                        internalType: "uint256",
                        name: "_acceptedPrice",
                        type: "uint256",
                    },
                    {
                        internalType: "address",
                        name: "_taker",
                        type: "address",
                    },
                ],
                name: "acceptOrder",
                outputs: [],
                stateMutability: "nonpayable",
                type: "function",
            },
        ];

        // Estimate gas
        const gasEstimate = await publicClient.estimateContractGas({
            address: contractAddress,
            abi: contractABI,
            functionName: "acceptOrder",
            args: [orderId, acceptedPriceWei, resolverAddress],
            account: account,
        });

        // Add 20% buffer to gas estimate
        const gasLimit = (gasEstimate * 120n) / 100n;

        // Send transaction
        const txHash = await walletClient.writeContract({
            address: contractAddress,
            abi: contractABI,
            functionName: "acceptOrder",
            args: [orderId, acceptedPriceWei, resolverAddress],
            gas: gasLimit,
        });

        console.log(`Transaction sent by relayer: ${txHash}`);

        // Wait for confirmation
        const receipt = await publicClient.waitForTransactionReceipt({
            hash: txHash,
        });

        if (receipt.status === "success") {
            console.log(
                `✅ Order ${orderId} accepted successfully! Tx: ${txHash}`
            );

            // Emit Socket.IO event for order acceptance (pure blockchain, no database)
            const io = req.app.get("io");
            if (io) {
                io.emit("orderAccepted", {
                    orderId,
                    acceptedPrice,
                    resolverAddress,
                    transactionHash: txHash,
                    timestamp: new Date(),
                });
            }

            // Signal back to the resolver that the order was accepted
            try {
                await signalResolverOrderAccepted(orderId, resolverAddress, {
                    transactionHash: txHash,
                    blockNumber: Number(receipt.blockNumber),
                    acceptedPrice,
                });
            } catch (signalError) {
                console.warn(
                    `Failed to signal resolver: ${signalError.message}`
                );
                // Don't fail the response if signaling fails
            }

            res.json({
                success: true,
                message: "Order accepted successfully",
                data: {
                    orderId,
                    acceptedPrice,
                    resolverAddress,
                    transactionHash: txHash,
                    blockNumber: Number(receipt.blockNumber),
                    gasUsed: receipt.gasUsed.toString(),
                },
            });
        } else {
            console.error(
                `❌ Transaction failed for order ${orderId}. Tx: ${txHash}`
            );
            res.status(500).json({
                error: "Transaction failed",
                message: `Failed to accept order ${orderId}`,
                transactionHash: txHash,
            });
        }
    } catch (error) {
        console.error(`Error accepting order ${req.params.orderId}:`, error);

        let errorMessage = "Failed to accept order";
        let statusCode = 500;

        // Parse specific blockchain errors
        if (error.message.includes("OrderProtocol__AlreadyAccepted")) {
            errorMessage = `Order ${req.params.orderId} was already accepted by another resolver`;
            statusCode = 409;
        } else if (error.message.includes("OrderProtocol__InvalidPrice")) {
            errorMessage = `Invalid price for order ${req.params.orderId}`;
            statusCode = 400;
        } else if (error.message.includes("OrderProtocol__NotAResolver")) {
            errorMessage = `Address ${req.body.resolverAddress} is not registered as a resolver`;
            statusCode = 403;
        } else if (
            error.message.includes("OrderProtocol__OrderDoesNotExists")
        ) {
            errorMessage = `Order ${req.params.orderId} does not exist`;
            statusCode = 404;
        }

        res.status(statusCode).json({
            error: errorMessage,
            message: error.message,
        });
    }
});

// POST /api/orders/:orderId/start-auction - Start Dutch auction for an order
router.post("/:orderId/start-auction", async (req, res) => {
    try {
        const { orderId } = req.params;
        const { duration = 5000 } = req.body; // Default 5 seconds

        // Find the order
        const order = await Order.findByOrderId(orderId);
        if (!order) {
            return res.status(404).json({
                error: "Order not found",
                message: `No order found with ID ${orderId}`,
            });
        }

        // Check if order is eligible for auction
        if (order.status !== "created") {
            return res.status(400).json({
                error: "Order not eligible for auction",
                message: `Order status is '${order.status}', must be 'created'`,
            });
        }

        if (order.auctionActive) {
            return res.status(400).json({
                error: "Auction already active",
                message: `Auction is already running for order ${orderId}`,
            });
        }

        // Update order in database
        order.status = "auction_active";
        order.auctionActive = true;
        order.auctionStartTime = new Date();
        order.auctionEndTime = new Date(Date.now() + duration);
        order.currentPrice = order.startPrice;
        await order.save();

        // Start Dutch auction
        const auctionManager = req.app.get("auctionManager");

        // Convert wei-formatted prices to decimal for auction display
        // Database stores prices in wei format (e.g., "95000000000000000000")
        // but auction needs decimal format (e.g., 95.0)
        // Use BigInt for precision then convert to number
        const startPriceWei = BigInt(order.startPrice);
        const endPriceWei = BigInt(order.endPrice);
        const divisor = BigInt(10 ** 18);

        const startPriceDecimal = Number(startPriceWei / divisor);
        const endPriceDecimal = Number(endPriceWei / divisor);

        console.log(`🔄 Converting prices for auction:
            Start: ${order.startPrice} wei → ${startPriceDecimal} INR
            End: ${order.endPrice} wei → ${endPriceDecimal} INR`);

        const auction = auctionManager.createAuction(
            orderId,
            startPriceDecimal,
            endPriceDecimal,
            duration
        );

        res.json({
            success: true,
            message: "Dutch auction started successfully",
            data: {
                orderId,
                startPrice: auction.startPrice,
                endPrice: auction.endPrice,
                duration: auction.duration,
                startTime: auction.startTime,
            },
        });
    } catch (error) {
        console.error(
            `Error starting Dutch auction for order ${req.params.orderId}:`,
            error
        );
        res.status(500).json({
            error: "Failed to start auction",
            message: "An internal server error occurred",
        });
    }
});

// GET /api/orders/:orderId/auction-status - Get current auction status
router.get("/:orderId/auction-status", async (req, res) => {
    try {
        const { orderId } = req.params;

        const auctionManager = req.app.get("auctionManager");
        const auction = auctionManager.getActiveAuction(orderId);

        if (!auction) {
            return res.json({
                success: true,
                data: {
                    active: false,
                    message: "No active auction for this order",
                },
            });
        }

        const elapsed = Date.now() - auction.startTime;
        const progress = Math.min(elapsed / auction.duration, 1) * 100;
        const timeRemaining = Math.max(auction.duration - elapsed, 0);

        res.json({
            success: true,
            data: {
                active: auction.isActive,
                orderId: auction.orderId,
                startPrice: auction.startPrice,
                endPrice: auction.endPrice,
                currentPrice: auction.currentPrice,
                progress,
                timeRemaining,
                startTime: auction.startTime,
                duration: auction.duration,
            },
        });
    } catch (error) {
        console.error(
            `Error getting auction status for order ${req.params.orderId}:`,
            error
        );
        res.status(500).json({
            error: "Failed to get auction status",
            message: "An internal server error occurred",
        });
    }
});

/**
 * Fulfill order after payment verification
 * POST /api/orders/:orderId/fulfill
 */
router.post("/:orderId/fulfill", async (req, res) => {
    try {
        const { orderId } = req.params;
        const { transactionId, resolverAddress } = req.body;

        console.log(`📤 Received fulfillment request for order: ${orderId}`);
        console.log(`🔗 Transaction ID: ${transactionId}`);
        console.log(`👤 Resolver: ${resolverAddress}`);

        if (!transactionId || !resolverAddress) {
            return res.status(400).json({
                error: "Missing required fields",
                message: "transactionId and resolverAddress are required",
            });
        }

        // Step 1: Get order details from smart contract
        const orderDetails = await getOrderFromContract(orderId);
        if (!orderDetails) {
            return res.status(404).json({
                error: "Order not found",
                message: `Order ${orderId} does not exist on contract`,
            });
        }

        console.log(`📋 Order details:`, {
            accepted: orderDetails.accepted,
            amount: orderDetails.amount,
            recipientUpi: orderDetails.recipientUpiAddress,
            acceptedTime: orderDetails.acceptedTime,
        });

        if (!orderDetails.accepted) {
            return res.status(400).json({
                error: "Order not accepted",
                message: "Order must be accepted before fulfillment",
            });
        }

        // Step 2: Verify transaction with RazorpayX
        const transactionDetails = await verifyRazorpayXTransaction(
            transactionId
        );
        if (!transactionDetails) {
            return res.status(400).json({
                error: "Transaction verification failed",
                message: "Could not verify transaction with RazorpayX",
            });
        }

        // Step 3: Validate transaction details
        const validation = validateTransaction(
            orderDetails,
            transactionDetails
        );
        if (!validation.valid) {
            return res.status(400).json({
                error: "Transaction validation failed",
                message: validation.reason,
            });
        }

        // Step 4: Call fulfillOrder on smart contract
        const fulfillmentResult = await fulfillOrderOnContract(
            orderId,
            transactionId
        );
        if (!fulfillmentResult.success) {
            return res.status(500).json({
                error: "Contract fulfillment failed",
                message: fulfillmentResult.message,
            });
        }

        console.log(`✅ Order ${orderId} fulfilled successfully!`);
        console.log(
            `📝 Transaction hash: ${fulfillmentResult.transactionHash}`
        );

        // Emit fulfillment event via Socket.IO
        const io = req.app.get("socketio");
        if (io) {
            io.emit("orderFulfilled", {
                orderId,
                transactionId,
                transactionHash: fulfillmentResult.transactionHash,
                blockNumber: fulfillmentResult.blockNumber,
                timestamp: new Date().toISOString(),
            });
        }

        res.status(200).json({
            success: true,
            message: "Order fulfilled successfully",
            transactionHash: fulfillmentResult.transactionHash,
            blockNumber: fulfillmentResult.blockNumber,
        });
    } catch (error) {
        console.error("❌ Error fulfilling order:", error);
        res.status(500).json({
            error: "Internal server error",
            message: error.message,
        });
    }
});

/**
 * Get order details from smart contract
 */
async function getOrderFromContract(orderId) {
    try {
        const rpcUrl = process.env.RPC_URL;
        const contractAddress = process.env.CONTRACT_ADDRESS;

        // Create public client for reading blockchain data
        const publicClient = createPublicClient({
            chain: {
                id: 4801,
                name: "Worldchain Sepolia",
                network: "worldchain-sepolia",
                nativeCurrency: { name: "ETH", symbol: "ETH", decimals: 18 },
                rpcUrls: {
                    default: { http: [rpcUrl] },
                    public: { http: [rpcUrl] },
                },
                blockExplorers: {
                    default: {
                        name: "Explorer",
                        url: "https://worldchain-sepolia.explorer.alchemy.com",
                    },
                },
            },
            transport: http(rpcUrl),
        });

        // getOrder function ABI
        const getOrderABI = [
            {
                inputs: [
                    {
                        internalType: "bytes32",
                        name: "_orderId",
                        type: "bytes32",
                    },
                ],
                name: "getOrder",
                outputs: [
                    {
                        components: [
                            {
                                internalType: "address",
                                name: "maker",
                                type: "address",
                            },
                            {
                                internalType: "address",
                                name: "taker",
                                type: "address",
                            },
                            {
                                internalType: "string",
                                name: "recipientUpiAddress",
                                type: "string",
                            },
                            {
                                internalType: "uint256",
                                name: "amount",
                                type: "uint256",
                            },
                            {
                                internalType: "address",
                                name: "token",
                                type: "address",
                            },
                            {
                                internalType: "uint256",
                                name: "startPrice",
                                type: "uint256",
                            },
                            {
                                internalType: "uint256",
                                name: "acceptedPrice",
                                type: "uint256",
                            },
                            {
                                internalType: "uint256",
                                name: "endPrice",
                                type: "uint256",
                            },
                            {
                                internalType: "uint256",
                                name: "startTime",
                                type: "uint256",
                            },
                            {
                                internalType: "uint256",
                                name: "acceptedTime",
                                type: "uint256",
                            },
                            {
                                internalType: "bool",
                                name: "accepted",
                                type: "bool",
                            },
                            {
                                internalType: "bool",
                                name: "fullfilled",
                                type: "bool",
                            },
                        ],
                        internalType: "struct OrderProtocol.Order",
                        name: "",
                        type: "tuple",
                    },
                ],
                stateMutability: "view",
                type: "function",
            },
        ];

        // Call getOrder function
        console.log("📞 Calling getOrder with args:", [orderId]);
        const result = await publicClient.readContract({
            address: contractAddress,
            abi: getOrderABI,
            functionName: "getOrder",
            args: [orderId],
        });

        console.log("✅ Contract call successful, raw result:", result);

        // Convert result to readable format
        return {
            maker: result.maker,
            taker: result.taker,
            recipientUpiAddress: result.recipientUpiAddress,
            amount: result.amount.toString(), // Convert BigInt to string
            token: result.token,
            startPrice: result.startPrice.toString(),
            acceptedPrice: result.acceptedPrice.toString(),
            endPrice: result.endPrice.toString(),
            startTime: Number(result.startTime), // Convert to number for timestamp
            acceptedTime: Number(result.acceptedTime),
            accepted: result.accepted,
            fullfilled: result.fullfilled,
        };
    } catch (error) {
        console.error("Error getting order from contract:", error);
        return null;
    }
}

/**
 * Verify transaction with RazorpayX API
 */
async function verifyRazorpayXTransaction(payoutId) {
    try {
        const response = await axios.get(
            `https://api.razorpay.com/v1/payouts/${payoutId}`,
            {
                auth: {
                    username: process.env.RAZORPAYX_KEY_ID,
                    password: process.env.RAZORPAYX_KEY_SECRET,
                },
                timeout: 30000,
            }
        );

        return response.data;
    } catch (error) {
        console.error("Error verifying RazorpayX payout:", error);
        return null;
    }
}

/**
 * Validate transaction details against order requirements
 */
function validateTransaction(orderDetails, payoutDetails) {
    // The order amount on contract is in wei (ETH), but we need to compare with INR
    // Since the order represents ₹100 as 100 ETH (1:1 ratio for simplicity in this demo)
    // We can extract the INR amount by taking the integer part of ETH amount
    const orderAmountWei = BigInt(orderDetails.amount);
    const orderAmountETH = Number(orderAmountWei) / 1e18; // Convert wei to ETH
    const expectedAmountINR = Math.floor(orderAmountETH); // Assume 1 ETH = ₹1 for demo
    const expectedAmountPaise = expectedAmountINR * 100;

    const actualAmountPaise = payoutDetails.amount;

    console.log("💰 Amount validation:");
    console.log("- Order amount (wei):", orderAmountWei.toString());
    console.log("- Order amount (ETH):", orderAmountETH);
    console.log("- Expected INR:", expectedAmountINR);
    console.log("- Expected paise:", expectedAmountPaise);
    console.log("- Actual paise:", actualAmountPaise);

    if (actualAmountPaise !== expectedAmountPaise) {
        return {
            valid: false,
            reason: `Amount mismatch: expected ${expectedAmountPaise} paise (₹${expectedAmountINR}), got ${actualAmountPaise} paise (₹${
                actualAmountPaise / 100
            })`,
        };
    }

    // Check if payout is successful (allow both processed and processing for testing)
    if (
        payoutDetails.status !== "processed" &&
        payoutDetails.status !== "processing"
    ) {
        return {
            valid: false,
            reason: `Payout not successful: status is ${payoutDetails.status} (expected 'processed' or 'processing')`,
        };
    }

    // Check timing - payout should be after order acceptance
    const payoutTime = payoutDetails.created_at;
    const acceptedTime = Math.floor(orderDetails.acceptedTime / 1000); // Convert from milliseconds to seconds

    if (payoutTime <= acceptedTime) {
        return {
            valid: false,
            reason: `Payout time (${payoutTime}) is before order acceptance time (${acceptedTime})`,
        };
    }

    return { valid: true };
}

/**
 * Call fulfillOrder function on smart contract
 */
async function fulfillOrderOnContract(orderId, proof) {
    try {
        const rpcUrl = process.env.RPC_URL;
        const contractAddress = process.env.CONTRACT_ADDRESS;
        const relayerPrivateKey = process.env.RELAYER_PRIVATE_KEY;

        // Chain configuration (copy from existing code)
        const worldchainSepolia = {
            id: 4801,
            name: "Worldchain Sepolia",
            network: "worldchain-sepolia",
            nativeCurrency: { name: "ETH", symbol: "ETH", decimals: 18 },
            rpcUrls: {
                default: { http: [rpcUrl] },
                public: { http: [rpcUrl] },
            },
            blockExplorers: {
                default: {
                    name: "Explorer",
                    url: "https://worldchain-sepolia.explorer.alchemy.com",
                },
            },
        };

        // Create account from private key
        const account = privateKeyToAccount(`0x${relayerPrivateKey}`);

        // Create public client for reading blockchain data
        const publicClient = createPublicClient({
            chain: worldchainSepolia,
            transport: http(rpcUrl),
        });

        // Create wallet client for sending transactions
        const walletClient = createWalletClient({
            account,
            chain: worldchainSepolia,
            transport: http(rpcUrl),
        });

        // fullfillOrder function ABI
        const fullfillOrderABI = [
            {
                inputs: [
                    {
                        internalType: "bytes32",
                        name: "_orderId",
                        type: "bytes32",
                    },
                    {
                        internalType: "string",
                        name: "_proof",
                        type: "string",
                    },
                ],
                name: "fullfillOrder",
                outputs: [],
                stateMutability: "nonpayable",
                type: "function",
            },
        ];

        // Estimate gas
        const gasEstimate = await publicClient.estimateContractGas({
            address: contractAddress,
            abi: fullfillOrderABI,
            functionName: "fullfillOrder",
            args: [orderId, proof],
            account: account,
        });

        console.log(`⛽ Estimated gas for fulfillOrder: ${gasEstimate}`);

        // Write to contract
        const hash = await walletClient.writeContract({
            address: contractAddress,
            abi: fullfillOrderABI,
            functionName: "fullfillOrder",
            args: [orderId, proof],
            gas: gasEstimate + BigInt(10000), // Add some buffer
            gasPrice: parseGwei("20"),
        });

        console.log(`📝 Transaction sent: ${hash}`);

        // Wait for transaction confirmation
        const receipt = await publicClient.waitForTransactionReceipt({ hash });

        console.log(
            `✅ Transaction confirmed in block: ${receipt.blockNumber}`
        );

        return {
            success: true,
            transactionHash: hash,
            blockNumber: Number(receipt.blockNumber),
            gasUsed: Number(receipt.gasUsed),
        };
    } catch (error) {
        console.error("Error calling fulfillOrder on contract:", error);
        return { success: false, message: error.message };
    }
}

module.exports = router;
