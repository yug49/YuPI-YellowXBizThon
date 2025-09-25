const { ethers } = require("ethers");
const winston = require("winston");
const fs = require("fs");
const path = require("path");
const axios = require("axios");
const express = require("express");
const { v4: uuidv4 } = require("uuid");
const { io } = require("socket.io-client");
const YellowResolverClient = require("./yellow/resolver-client");
require("dotenv").config();

// Configure logger
const logger = winston.createLogger({
    level: process.env.LOG_LEVEL || "info",
    format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.errors({ stack: true }),
        winston.format.json()
    ),
    defaultMeta: { service: "resolver-bot" },
    transports: [
        new winston.transports.File({ filename: "error.log", level: "error" }),
        new winston.transports.File({ filename: "combined.log" }),
        new winston.transports.Console({
            format: winston.format.combine(
                winston.format.colorize(),
                winston.format.simple()
            ),
        }),
    ],
});

class ResolverBot {
    constructor() {
        this.provider = null;
        this.wallet = null;
        this.contract = null;
        this.isListening = false;
        this.retryAttempts = 3;
        this.retryDelay = 2000; // 2 seconds
        this.callbackServer = null;
        this.callbackPort = process.env.RESOLVER_CALLBACK_PORT || 3001;

        // RazorpayX credentials
        this.razorpayKeyId = process.env.RAZORPAYX_KEY_ID;
        this.razorpayKeySecret = process.env.RAZORPAYX_KEY_SECRET;

        // Logger instance
        this.logger = logger;

        // Dutch auction support
        this.socketClient = null;

        // Yellow Network integration
        this.yellowClient = new YellowResolverClient(process.env.PRIVATE_KEY);
        this.yellowEnabled = process.env.YELLOW_ENABLED === "true";
        this.activeAuctions = new Map();
        this.auctionTimeouts = new Map();
    }

    async initialize() {
        try {
            logger.info("Initializing Resolver Bot...");

            // Validate environment variables
            this.validateEnvironment();

            // Set up blockchain connection
            this.provider = new ethers.JsonRpcProvider(process.env.RPC_URL);
            this.wallet = new ethers.Wallet(
                process.env.PRIVATE_KEY,
                this.provider
            );

            // Load contract ABI
            const abiPath = path.join(__dirname, "abi", "OrderProtocol.json");
            const contractABI = JSON.parse(fs.readFileSync(abiPath, "utf8"));

            // Create contract instance
            this.contract = new ethers.Contract(
                process.env.CONTRACT_ADDRESS,
                contractABI,
                this.wallet
            );

            // Test connection
            await this.testConnection();

            // Setup callback server
            await this.setupCallbackServer();

            // Register callback with backend
            await this.registerCallback();

            // Setup Dutch auction socket connection
            await this.setupAuctionSocket();

            logger.info("Resolver Bot initialized successfully");
            logger.info(`Wallet Address: ${this.wallet.address}`);
            logger.info(`Contract Address: ${process.env.CONTRACT_ADDRESS}`);
            logger.info(`Backend URL: ${process.env.BACKEND_URL}`);
            logger.info(
                `Callback Server: http://localhost:${this.callbackPort}`
            );
            logger.info(`RazorpayX Key ID: ${process.env.RAZORPAYX_KEY_ID}`);
            logger.info(`RazorpayX configured: ✅`);
        } catch (error) {
            logger.error("Failed to initialize Resolver Bot:", error);
            throw error;
        }
    }

    validateEnvironment() {
        const requiredVars = [
            "PRIVATE_KEY",
            "RPC_URL",
            "CONTRACT_ADDRESS",
            "BACKEND_URL",
            "RAZORPAYX_KEY_ID",
            "RAZORPAYX_KEY_SECRET",
        ];
        for (const varName of requiredVars) {
            if (!process.env[varName]) {
                throw new Error(
                    `Missing required environment variable: ${varName}`
                );
            }
        }
    }

    /**
     * Setup callback server to receive signals from backend
     */
    async setupCallbackServer() {
        try {
            logger.info(
                `🌐 Setting up callback server on port ${this.callbackPort}...`
            );

            const app = express();
            app.use(express.json());

            // Health check endpoint
            app.get("/health", (req, res) => {
                res.json({
                    status: "healthy",
                    resolver: this.wallet.address,
                    timestamp: new Date().toISOString(),
                });
            });

            // Order acceptance callback endpoint
            app.post("/callback/order-accepted", async (req, res) => {
                try {
                    const { type, orderId, resolverAddress, details } =
                        req.body;

                    logger.info(
                        `📡 Received callback: ${type} for order ${orderId}`
                    );

                    if (
                        type === "ORDER_ACCEPTED" &&
                        resolverAddress.toLowerCase() ===
                            this.wallet.address.toLowerCase()
                    ) {
                        logger.info(
                            `🎯 Processing callback for our accepted order ${orderId}`
                        );

                        // Process payment for the accepted order
                        setTimeout(async () => {
                            await this.processOrderPayment(orderId);
                        }, 1000); // Small delay to ensure transaction is confirmed

                        res.json({
                            success: true,
                            message: "Callback received and processing started",
                        });
                    } else {
                        res.json({
                            success: true,
                            message: "Callback not for this resolver",
                        });
                    }
                } catch (error) {
                    logger.error("Error handling callback:", error);
                    res.status(500).json({
                        error: "Failed to process callback",
                    });
                }
            });

            // Start server
            return new Promise((resolve, reject) => {
                this.callbackServer = app.listen(this.callbackPort, (error) => {
                    if (error) {
                        reject(error);
                    } else {
                        logger.info(
                            `✅ Callback server running on port ${this.callbackPort}`
                        );
                        resolve();
                    }
                });
            });
        } catch (error) {
            logger.error("Failed to setup callback server:", error);
            throw error;
        }
    }

    /**
     * Register callback URL with backend
     */
    async registerCallback() {
        try {
            const callbackUrl = `http://localhost:${this.callbackPort}/callback/order-accepted`;

            logger.info(`📡 Registering callback URL: ${callbackUrl}`);

            const response = await axios.post(
                `${process.env.BACKEND_URL}/api/orders/resolver/register`,
                {
                    resolverAddress: this.wallet.address,
                    callbackUrl: callbackUrl,
                },
                {
                    headers: {
                        "Content-Type": "application/json",
                    },
                    timeout: 10000,
                }
            );

            if (response.status === 200 && response.data.success) {
                logger.info(`✅ Callback registered successfully with backend`);
            } else {
                logger.warn(`⚠️ Failed to register callback:`, response.data);
            }
        } catch (error) {
            logger.error(
                "Failed to register callback with backend:",
                error.message
            );
            // Don't throw error - callback registration failure shouldn't stop the bot
        }
    }

    /**
     * Setup Socket.IO connection for Dutch auction events
     */
    async setupAuctionSocket() {
        try {
            const backendUrl =
                process.env.BACKEND_URL || "http://localhost:5001";

            logger.info(`🔌 Connecting to auction server at ${backendUrl}...`);

            this.socketClient = io(backendUrl, {
                withCredentials: true,
                transports: ["websocket", "polling"],
            });

            this.socketClient.on("connect", () => {
                logger.info("🔌 Connected to Dutch auction server");
            });

            this.socketClient.on("disconnect", () => {
                logger.warn("🔌 Disconnected from Dutch auction server");
            });

            this.socketClient.on("auctionStarted", (data) => {
                logger.info(
                    `🚀 Dutch auction started for order ${data.orderId}`
                );
                this.handleAuctionStarted(data);
            });

            this.socketClient.on("priceUpdate", (data) => {
                this.handlePriceUpdate(data);
            });

            this.socketClient.on("auctionAccepted", (data) => {
                logger.info(
                    `✅ Dutch auction accepted for order ${data.orderId}`
                );
                this.handleAuctionAccepted(data);
            });

            this.socketClient.on("auctionEnded", (data) => {
                logger.info(
                    `🏁 Dutch auction ended for order ${data.orderId}: ${data.reason}`
                );
                this.handleAuctionEnded(data);
            });

            this.socketClient.on("connect_error", (error) => {
                logger.error(
                    "❌ Failed to connect to auction server:",
                    error.message
                );
            });
        } catch (error) {
            logger.error("Failed to setup auction socket:", error);
            // Don't throw error - auction features are optional
        }
    }

    /**
     * Handle auction started event - decide whether to participate
     */
    handleAuctionStarted(auctionData) {
        const { orderId, startPrice, endPrice, duration } = auctionData;

        // Random decision: 70% chance to participate in auction
        const shouldParticipate = Math.random() < 0.7;

        if (!shouldParticipate) {
            logger.info(
                `⏭️ Skipping auction for order ${orderId} (random decision)`
            );
            return;
        }

        logger.info(`🎯 Participating in Dutch auction for order ${orderId}`);
        logger.info(
            `📊 Price range: ₹${startPrice} → ₹${endPrice} over ${duration}ms`
        );

        // Store auction info
        this.activeAuctions.set(orderId, {
            ...auctionData,
            participating: true,
            startTime: Date.now(),
        });

        // Schedule random acceptance time between 0.5s and 4.5s (leaving 0.5s buffer)
        const minDelay = 500; // 0.5 seconds
        const maxDelay = 4500; // 4.5 seconds
        const randomDelay = Math.random() * (maxDelay - minDelay) + minDelay;

        logger.info(
            `⏰ Will attempt to accept auction for order ${orderId} in ${randomDelay.toFixed(
                0
            )}ms`
        );

        const timeoutId = setTimeout(() => {
            this.attemptAuctionAcceptance(orderId);
        }, randomDelay);

        this.auctionTimeouts.set(orderId, timeoutId);
    }

    /**
     * Handle price update during auction
     */
    handlePriceUpdate(data) {
        const { orderId, currentPrice, progress } = data;
        const auction = this.activeAuctions.get(orderId);

        if (auction && auction.participating) {
            // Log every 20% progress
            if (
                Math.floor(progress / 20) !==
                Math.floor(auction.lastLoggedProgress / 20)
            ) {
                logger.info(
                    `📉 Order ${orderId} price: ₹${currentPrice.toFixed(
                        2
                    )} (${progress.toFixed(1)}%)`
                );
                auction.lastLoggedProgress = progress;
            }
        }
    }

    /**
     * Attempt to accept auction at current price
     */
    async attemptAuctionAcceptance(orderId) {
        try {
            const auction = this.activeAuctions.get(orderId);
            if (!auction || !auction.participating) {
                logger.warn(
                    `⚠️ Cannot accept auction for order ${orderId} - not participating`
                );
                return;
            }

            // Check if auction is still active by making API call
            const backendUrl = process.env.BACKEND_URL;
            const statusResponse = await axios.get(
                `${backendUrl}/api/orders/${orderId}/auction-status`
            );

            if (
                !statusResponse.data.success ||
                !statusResponse.data.data.active
            ) {
                logger.warn(
                    `⚠️ Auction for order ${orderId} is no longer active`
                );
                this.cleanupAuction(orderId);
                return;
            }

            const currentPrice = statusResponse.data.data.currentPrice;
            logger.info(
                `🎯 Attempting to accept order ${orderId} at price ₹${currentPrice.toFixed(
                    2
                )}`
            );

            // Accept the order at current Dutch auction price
            const success = await this.acceptOrder(
                orderId,
                currentPrice.toString()
            );

            if (success) {
                logger.info(
                    `🎉 Successfully accepted Dutch auction for order ${orderId} at ₹${currentPrice.toFixed(
                        2
                    )}`
                );
            } else {
                logger.warn(
                    `❌ Failed to accept Dutch auction for order ${orderId}`
                );
            }

            this.cleanupAuction(orderId);
        } catch (error) {
            logger.error(
                `Error attempting auction acceptance for order ${orderId}:`,
                error.message
            );
            this.cleanupAuction(orderId);
        }
    }

    /**
     * Handle auction accepted event
     */
    handleAuctionAccepted(data) {
        const { orderId } = data;
        this.cleanupAuction(orderId);
    }

    /**
     * Handle auction ended event
     */
    handleAuctionEnded(data) {
        const { orderId } = data;
        this.cleanupAuction(orderId);
    }

    /**
     * Clean up auction tracking data
     */
    cleanupAuction(orderId) {
        // Clear timeout if exists
        const timeoutId = this.auctionTimeouts.get(orderId);
        if (timeoutId) {
            clearTimeout(timeoutId);
            this.auctionTimeouts.delete(orderId);
        }

        // Remove auction data
        this.activeAuctions.delete(orderId);

        logger.debug(`🧹 Cleaned up auction data for order ${orderId}`);
    }

    async testConnection() {
        try {
            const network = await this.provider.getNetwork();
            const balance = await this.provider.getBalance(this.wallet.address);

            logger.info(
                `Connected to network: ${network.name} (Chain ID: ${network.chainId})`
            );
            logger.info(`Wallet balance: ${ethers.formatEther(balance)} ETH`);

            if (balance === 0n) {
                logger.warn(
                    "Wallet has zero balance - may not be able to send transactions"
                );
            }
        } catch (error) {
            logger.error("Connection test failed:", error);
            throw error;
        }
    }

    /**
     * Generate Authorization header for RazorpayX API calls
     * Format: Basic base64(key_id:key_secret)
     * @returns {string} Authorization header value
     */
    getRazorpayXAuthHeader() {
        const keyId = process.env.RAZORPAYX_KEY_ID;
        const keySecret = process.env.RAZORPAYX_KEY_SECRET;

        // Create base64 encoded string of key_id:key_secret
        const credentials = `${keyId}:${keySecret}`;
        const base64Credentials = Buffer.from(credentials).toString("base64");

        return `Basic ${base64Credentials}`;
    }

    calculateAcceptedPrice(startPrice, endPrice) {
        // Calculate a random price between start and end price
        // For better strategy, we could implement Dutch auction logic here
        const startPriceBN = BigInt(startPrice);
        const endPriceBN = BigInt(endPrice);

        // Generate random factor between 0.3 and 0.7 (30% to 70% of the range)
        const randomFactor = Math.random() * 0.4 + 0.3;
        const range = startPriceBN - endPriceBN;
        const discount = BigInt(Math.floor(Number(range) * randomFactor));

        const acceptedPrice = startPriceBN - discount;

        logger.info(
            `Price calculation - Start: ${startPrice}, End: ${endPrice}, Accepted: ${acceptedPrice.toString()}`
        );

        return acceptedPrice.toString();
    }

    /**
     * Read order details from the contract
     * @param {string} orderId - The order ID to read
     * @returns {Object} Order details from the contract
     */
    async readOrderFromContract(orderId) {
        try {
            logger.info(`📖 Reading order ${orderId} from contract...`);

            const order = await this.contract.getOrder(orderId);

            const orderDetails = {
                maker: order.maker,
                taker: order.taker,
                recipientUpiAddress: order.recipientUpiAddress,
                amount: order.amount.toString(), // Amount in INR (18 decimals)
                token: order.token,
                startPrice: order.startPrice.toString(),
                acceptedPrice: order.acceptedPrice.toString(),
                endPrice: order.endPrice.toString(),
                startTime: Number(order.startTime),
                acceptedTime: Number(order.acceptedTime),
                accepted: order.accepted,
                fullfilled: order.fullfilled,
            };

            logger.info(`📋 Order details:`, {
                orderId,
                recipientUpi: orderDetails.recipientUpiAddress,
                amountINR: ethers.formatEther(orderDetails.amount), // Convert to readable format
                accepted: orderDetails.accepted,
                taker: orderDetails.taker,
            });

            return orderDetails;
        } catch (error) {
            logger.error(
                `Failed to read order ${orderId} from contract:`,
                error
            );
            throw error;
        }
    }

    /**
     * Create a contact for RazorpayX transactions
     * @param {Object} contactDetails - Contact details
     * @returns {Object} Contact response
     */
    async createContact(orderHash) {
        try {
            // Create a short reference ID (max 40 chars for RazorpayX)
            // Use last 30 chars of order hash for uniqueness
            const shortOrderId = orderHash.slice(-30);
            const referenceId = `ord_${shortOrderId}`;

            const contactData = {
                name: "Order Recipient",
                email: "order@yourapp.com",
                contact: "9999999999",
                type: "self",
                reference_id: referenceId,
                notes: {
                    order_id: orderHash,
                    payment_type: "order_settlement",
                },
            };

            this.logger.info(
                `📞 Creating contact for order ${orderHash} (ref: ${referenceId})`
            );

            const response = await axios.post(
                "https://api.razorpay.com/v1/contacts",
                contactData,
                {
                    auth: {
                        username: this.razorpayKeyId,
                        password: this.razorpayKeySecret,
                    },
                    headers: {
                        "Content-Type": "application/json",
                    },
                }
            );

            this.logger.info(
                `✅ Contact created successfully: ${response.data.id}`
            );
            return response.data;
        } catch (error) {
            // Simple debug logging to avoid circular reference issues
            console.log("🚨 ERROR IN CONTACT CREATION:");
            console.log("Error message:", error.message);
            console.log("Error type:", typeof error);
            console.log("Has response:", !!error.response);

            this.logger.error("RazorpayX Contact API Error", {
                status: error.response?.status,
                data: error.response?.data,
                message: error.message,
                hasResponse: !!error.response,
            });

            let errorMessage = error.message || "Unknown error";
            if (error.response && error.response.data) {
                if (
                    error.response.data.error &&
                    error.response.data.error.description
                ) {
                    errorMessage = error.response.data.error.description;
                } else {
                    errorMessage = JSON.stringify(error.response.data);
                }
            }

            throw new Error(`Failed to create contact: ${errorMessage}`);
        }
    }

    /**
     * Create a fund account for UPI payments
     * @param {Object} fundAccountDetails - Fund account details
     * @returns {Object} Fund account response
     */
    async createFundAccount(fundAccountDetails) {
        try {
            const { recipientUpiAddress, contactId } = fundAccountDetails;

            logger.info(
                `🏦 Creating fund account for ${recipientUpiAddress}...`
            );

            const fundAccountPayload = {
                contact_id: contactId,
                account_type: "vpa",
                vpa: {
                    address: recipientUpiAddress,
                },
            };

            const response = await axios.post(
                "https://api.razorpay.com/v1/fund_accounts",
                fundAccountPayload,
                {
                    headers: {
                        Authorization: this.getRazorpayXAuthHeader(),
                        "Content-Type": "application/json",
                    },
                    timeout: 30000,
                }
            );

            if (response.status === 200 || response.status === 201) {
                const fundAccountData = response.data;
                logger.info(`✅ Fund account created: ${fundAccountData.id}`);
                return {
                    success: true,
                    fundAccountId: fundAccountData.id,
                    data: fundAccountData,
                };
            } else {
                logger.error(
                    `❌ Fund account creation failed with status ${response.status}`
                );
                return {
                    success: false,
                    error: `HTTP ${response.status}`,
                    message: response.data,
                };
            }
        } catch (error) {
            logger.error(`Failed to create fund account:`, error);

            if (error.response) {
                const { status, data } = error.response;
                logger.error(
                    `RazorpayX Fund Account API Error ${status}:`,
                    data
                );

                return {
                    success: false,
                    error: `API Error ${status}`,
                    message:
                        data.error?.description ||
                        data.message ||
                        "Unknown error",
                    details: data,
                };
            }

            return {
                success: false,
                error: error.code || "UNKNOWN_ERROR",
                message: error.message,
            };
        }
    }

    /**
     * Create a VPA payout using RazorpayX API (proper flow)
     * @param {Object} paymentDetails - Payment details
     * @returns {Object} Payout response
     */
    async createVPAPayout(paymentDetails) {
        try {
            const {
                recipientUpiAddress,
                amountPaise,
                orderId,
                recipientName = "Order Recipient",
            } = paymentDetails;

            logger.info(
                `💳 Creating VPA payout for ${amountPaise} paise to ${recipientUpiAddress}`
            );

            // Step 1: Create contact
            const contact = await this.createContact(orderId);

            if (!contact || !contact.id) {
                logger.error(
                    `❌ Failed to create contact: No contact ID returned`
                );
                return { success: false, message: "Failed to create contact" };
            }

            const contactId = contact.id;
            logger.info(`👤 Using contact: ${contactId}`);

            // Step 2: Create fund account
            const fundAccountResult = await this.createFundAccount({
                recipientUpiAddress,
                contactId,
            });

            if (!fundAccountResult.success) {
                logger.error(
                    `❌ Failed to create fund account: ${fundAccountResult.message}`
                );
                return fundAccountResult;
            }

            const fundAccountId = fundAccountResult.fundAccountId;
            logger.info(`🏦 Using fund account: ${fundAccountId}`);

            // Step 3: Create payout
            const idempotencyKey = uuidv4();

            const payoutPayload = {
                account_number: process.env.RAZORPAYX_ACCOUNT_NUMBER,
                fund_account_id: fundAccountId,
                amount: amountPaise, // Amount in paise
                currency: "INR",
                mode: "UPI",
                purpose: "payout",
                queue_if_low_balance: true,
                reference_id: `order_${orderId.substring(0, 10)}`,
                narration: `Order Payment`, // Keep under 30 chars
                notes: {
                    order_id: orderId,
                    payment_method: "UPI",
                    processed_by: "resolver_bot",
                },
            };

            logger.info(
                `📤 Creating payout with fund account ${fundAccountId}...`
            );

            const response = await axios.post(
                "https://api.razorpay.com/v1/payouts",
                payoutPayload,
                {
                    headers: {
                        Authorization: this.getRazorpayXAuthHeader(),
                        "Content-Type": "application/json",
                        "X-Payout-Idempotency": idempotencyKey,
                    },
                    timeout: 30000,
                }
            );

            if (response.status === 200 || response.status === 201) {
                const payoutData = response.data;
                logger.info(`✅ VPA payout created successfully!`);
                logger.info(`💰 Payout ID: ${payoutData.id}`);
                logger.info(
                    `🏦 Fund Account ID: ${payoutData.fund_account_id}`
                );
                logger.info(`📊 Status: ${payoutData.status}`);
                logger.info(`🔗 UTR: ${payoutData.utr || "Pending"}`);

                return {
                    success: true,
                    payoutId: payoutData.id,
                    fundAccountId: payoutData.fund_account_id,
                    contactId: contactId,
                    status: payoutData.status,
                    utr: payoutData.utr,
                    fees: payoutData.fees,
                    tax: payoutData.tax,
                    createdAt: payoutData.created_at,
                    data: payoutData,
                };
            } else {
                logger.error(
                    `❌ VPA payout failed with status ${response.status}`
                );
                return {
                    success: false,
                    error: `HTTP ${response.status}`,
                    message: response.data,
                };
            }
        } catch (error) {
            logger.error(`Failed to create VPA payout:`, error);

            if (error.response) {
                const { status, data } = error.response;
                logger.error(`RazorpayX API Error ${status}:`, data);

                return {
                    success: false,
                    error: `API Error ${status}`,
                    message:
                        data.error?.description ||
                        data.message ||
                        "Unknown error",
                    details: data,
                };
            }

            return {
                success: false,
                error: error.code || "UNKNOWN_ERROR",
                message: error.message,
            };
        }
    }

    /**
     * Process payment for an accepted order
     * @param {string} orderId - The order ID
     */
    async processOrderPayment(orderId) {
        try {
            logger.info(`🚀 Processing payment for order ${orderId}...`);

            // Step 1: Read order details from contract
            const orderDetails = await this.readOrderFromContract(orderId);

            // Validate order state
            if (!orderDetails.accepted) {
                logger.error(`❌ Order ${orderId} is not accepted yet`);
                return false;
            }

            if (orderDetails.fullfilled) {
                logger.warn(`⚠️ Order ${orderId} is already fulfilled`);
                return false;
            }

            if (
                orderDetails.taker.toLowerCase() !==
                this.wallet.address.toLowerCase()
            ) {
                logger.error(
                    `❌ This resolver is not the taker for order ${orderId}`
                );
                return false;
            }

            // Step 2: Calculate payment amount in paise (INR amount from contract is in 18 decimals)
            const amountInrWei = BigInt(orderDetails.amount);
            const amountInr = Number(ethers.formatEther(amountInrWei)); // Convert to regular INR
            const amountPaise = Math.round(amountInr * 100); // Convert to paise

            logger.info(`💰 Payment details:`, {
                orderId,
                amountINR: amountInr,
                amountPaise,
                recipientUpi: orderDetails.recipientUpiAddress,
            });

            // Step 2.5: Join Yellow Network session for instant settlement
            const startTime = Date.now();
            let yellowSessionId = null;

            if (this.yellowClient && this.yellowClient.isConnected()) {
                try {
                    logger.info(
                        `🟡 Joining Yellow Network session for order ${orderId}...`
                    );
                    yellowSessionId = await this.yellowClient.joinOrderSession(
                        orderId,
                        {
                            amount: amountInr,
                            recipientUpi: orderDetails.recipientUpiAddress,
                            makerAddress: orderDetails.maker,
                        }
                    );
                    logger.info(
                        `✅ Yellow Network session joined: ${yellowSessionId}`
                    );
                } catch (error) {
                    logger.warn(
                        `⚠️ Yellow Network session failed, falling back to standard payment:`,
                        error.message
                    );
                }
            }

            // Step 3: Create VPA payout (potentially accelerated by Yellow Network)
            const payoutResult = await this.createVPAPayout({
                recipientUpiAddress: orderDetails.recipientUpiAddress,
                amountPaise,
                orderId,
                yellowSessionId, // Pass session ID for tracking
            });

            if (payoutResult.success) {
                // Step 3.5: Execute instant settlement via Yellow Network if available
                if (yellowSessionId && this.yellowClient) {
                    try {
                        const settlementResult =
                            await this.yellowClient.executeInstantSettlement(
                                yellowSessionId,
                                payoutResult.payoutId,
                                payoutResult.utr
                            );

                        const processingTime = Date.now() - startTime;
                        logger.info(
                            `🚀 Yellow Network instant settlement completed in ${processingTime}ms`,
                            {
                                sessionId: yellowSessionId,
                                settlementId: settlementResult.settlementId,
                                performanceGain: `${Math.max(
                                    0,
                                    20000 - processingTime
                                )}ms faster`,
                            }
                        );
                    } catch (error) {
                        logger.warn(
                            `⚠️ Yellow Network settlement failed, standard processing continues:`,
                            error.message
                        );
                    }
                }

                // Step 4: Display success message
                this.displayPaymentSuccess({
                    orderId,
                    recipientUpi: orderDetails.recipientUpiAddress,
                    amountINR: amountInr,
                    amountPaise,
                    payoutId: payoutResult.payoutId,
                    utr: payoutResult.utr,
                    status: payoutResult.status,
                    contactId: payoutResult.contactId,
                    fundAccountId: payoutResult.fundAccountId,
                    fees: payoutResult.fees,
                    tax: payoutResult.tax,
                });

                // Step 5: Submit proof to backend for order fulfillment
                await this.submitProofToBackend(orderId, payoutResult.payoutId);

                return true;
            } else {
                logger.error(
                    `❌ Payment failed for order ${orderId}:`,
                    payoutResult.message
                );
                return false;
            }
        } catch (error) {
            logger.error(
                `Failed to process payment for order ${orderId}:`,
                error
            );
            return false;
        }
    }

    /**
     * Display payment success message with distinct formatting
     * @param {Object} paymentDetails - Payment details to display
     */
    displayPaymentSuccess(paymentDetails) {
        const {
            orderId,
            recipientUpi,
            amountINR,
            amountPaise,
            payoutId,
            utr,
            status,
            contactId,
            fundAccountId,
            fees = 0,
            tax = 0,
        } = paymentDetails;

        const separator = "=".repeat(80);
        const message = `
${separator}
🎉 PAYMENT SUCCESSFULLY COMPLETED! 🎉
${separator}
📋 Order ID: ${orderId}
💰 Amount: ₹${amountINR.toFixed(2)} (${amountPaise} paise)
🏦 Recipient UPI: ${recipientUpi}
🆔 Payout ID: ${payoutId}
🔗 UTR/Transaction ID: ${utr || "Processing..."}
📊 Status: ${status.toUpperCase()}
👤 Contact ID: ${contactId || "N/A"}
🏦 Fund Account ID: ${fundAccountId || "N/A"}
💳 Fees: ₹${((fees || 0) / 100).toFixed(2)}
📋 Tax: ₹${((tax || 0) / 100).toFixed(2)}
⏰ Processed At: ${new Date().toISOString()}
🤖 Processed By: Resolver Bot (${this.wallet.address})
${separator}
`;

        // Log with different levels for visibility
        logger.info(message);
        console.log("\x1b[32m%s\x1b[0m", message); // Green color in console
    }

    async acceptOrder(orderId, acceptedPrice) {
        try {
            logger.info(
                `Sending API request to accept order ${orderId} at price ${acceptedPrice}`
            );

            const backendUrl = process.env.BACKEND_URL;
            const apiEndpoint = `${backendUrl}/api/orders/${orderId}/accept`;

            const requestPayload = {
                acceptedPrice: acceptedPrice,
                resolverAddress: this.wallet.address,
            };

            logger.info(`Making request to: ${apiEndpoint}`);
            logger.info(`Request payload:`, requestPayload);

            // Make API call to backend
            const response = await axios.post(apiEndpoint, requestPayload, {
                headers: {
                    "Content-Type": "application/json",
                },
                timeout: 30000, // 30 second timeout
            });

            if (response.status === 200 && response.data.success) {
                const { transactionHash, blockNumber, gasUsed } =
                    response.data.data;
                logger.info(
                    `✅ Order ${orderId} accepted successfully via API!`
                );
                logger.info(`Transaction Hash: ${transactionHash}`);
                logger.info(`Block Number: ${blockNumber}`);
                logger.info(`Gas Used: ${gasUsed}`);
                return true;
            } else {
                logger.error(
                    `❌ API request failed for order ${orderId}:`,
                    response.data
                );
                return false;
            }
        } catch (error) {
            logger.error(
                `Failed to accept order ${orderId} via API:`,
                error.message
            );

            // Parse API error responses
            if (error.response) {
                const { status, data } = error.response;
                logger.error(`API Error ${status}:`, data);

                // Log specific error messages
                if (status === 409) {
                    logger.warn(
                        `Order ${orderId} was already accepted by another resolver`
                    );
                } else if (status === 400) {
                    logger.warn(
                        `Invalid price or parameters for order ${orderId}`
                    );
                } else if (status === 403) {
                    logger.error(
                        `Resolver ${this.wallet.address} is not registered as a resolver`
                    );
                } else if (status === 404) {
                    logger.warn(`Order ${orderId} does not exist`);
                }
            } else if (error.code === "ECONNREFUSED") {
                logger.error(
                    "Cannot connect to backend server. Is it running?"
                );
            } else if (error.code === "ETIMEDOUT") {
                logger.error("Request to backend server timed out");
            }

            return false;
        }
    }

    async handleOrderCreated(orderId, maker, amount, event) {
        try {
            const startTime = Date.now();
            logger.info(
                `🚨 New order detected! ID: ${orderId}, Maker: ${maker}, Amount: ${amount}`
            );

            // Get order details
            const order = await this.contract.getOrder(orderId);

            logger.info(`Order details:`, {
                maker: order.maker,
                startPrice: order.startPrice.toString(),
                endPrice: order.endPrice.toString(),
                token: order.token,
                amount: order.amount.toString(),
            });

            // Check if order is still valid and not accepted
            if (order.accepted) {
                logger.warn(`Order ${orderId} is already accepted`);
                return;
            }

            if (order.fullfilled) {
                logger.warn(`Order ${orderId} is already fulfilled`);
                return;
            }

            // Calculate accepted price
            const acceptedPrice = this.calculateAcceptedPrice(
                order.startPrice.toString(),
                order.endPrice.toString()
            );

            // Accept the order
            const success = await this.acceptOrder(orderId, acceptedPrice);

            const processingTime = Date.now() - startTime;
            logger.info(`Order processing completed in ${processingTime}ms`);

            if (success) {
                logger.info(
                    `🎉 Successfully accepted order ${orderId} in ${processingTime}ms`
                );
            }
        } catch (error) {
            logger.error(`Error handling OrderCreated event:`, error);
        }
    }

    async startListening() {
        try {
            if (this.isListening) {
                logger.warn("Bot is already listening for events");
                return;
            }

            logger.info("🎧 Starting to listen for OrderCreated events...");

            // Listen for OrderCreated events
            this.contract.on(
                "OrderCreated",
                async (orderId, maker, amount, event) => {
                    await this.handleOrderCreated(
                        orderId,
                        maker,
                        amount,
                        event
                    );
                }
            );

            // Listen for other relevant events for monitoring
            this.contract.on(
                "OrderAccepted",
                (orderId, taker, acceptedPrice, event) => {
                    logger.info(
                        `📋 Order ${orderId} accepted by ${taker} at price ${acceptedPrice}`
                    );
                }
            );

            this.isListening = true;
            logger.info("✅ Bot is now actively listening for events");
        } catch (error) {
            logger.error("Failed to start listening:", error);
            throw error;
        }
    }

    async stopListening() {
        try {
            if (!this.isListening) {
                logger.warn("Bot is not currently listening");
                return;
            }

            logger.info("🛑 Stopping event listener...");

            // Remove all listeners
            this.contract.removeAllListeners();
            this.isListening = false;

            // Close callback server
            if (this.callbackServer) {
                await new Promise((resolve) => {
                    this.callbackServer.close(() => {
                        logger.info("📴 Callback server stopped");
                        resolve();
                    });
                });
            }

            // Close auction socket connection
            if (this.socketClient) {
                this.socketClient.disconnect();
                logger.info("📴 Auction socket disconnected");
            }

            // Clean up any active auction timeouts
            for (const [orderId, timeoutId] of this.auctionTimeouts) {
                clearTimeout(timeoutId);
                logger.debug(`🧹 Cleared timeout for auction ${orderId}`);
            }
            this.auctionTimeouts.clear();
            this.activeAuctions.clear();

            logger.info("✅ Event listener stopped");
        } catch (error) {
            logger.error("Error stopping listener:", error);
        }
    }

    /**
     * Submit payment proof to backend for order fulfillment verification
     */
    async submitProofToBackend(orderId, transactionId) {
        try {
            this.logger.info(
                `📤 Submitting proof to backend for order ${orderId}...`
            );
            this.logger.info(`🔗 Transaction ID: ${transactionId}`);

            const response = await axios.post(
                `${process.env.BACKEND_URL}/api/orders/${orderId}/fulfill`,
                {
                    transactionId: transactionId,
                    resolverAddress: this.wallet.address,
                },
                {
                    headers: {
                        "Content-Type": "application/json",
                    },
                    timeout: 30000,
                }
            );

            if (response.status === 200) {
                this.logger.info(`✅ Proof submitted successfully!`);
                this.logger.info(`📋 Backend response:`, response.data);
                return true;
            } else {
                this.logger.warn(
                    `⚠️ Unexpected response status: ${response.status}`
                );
                return false;
            }
        } catch (error) {
            this.logger.error("❌ Failed to submit proof to backend:", {
                orderId,
                transactionId,
                error: error.message,
            });
            return false;
        }
    }

    async start() {
        try {
            await this.initialize();
            await this.startListening();

            // Initialize Yellow Network connection
            if (this.yellowEnabled) {
                try {
                    await this.yellowClient.connect();
                    logger.info(
                        "🟡 Yellow Network integration enabled and connected"
                    );
                    logger.info(
                        "⚡ Ready for 85%+ faster crypto-to-UPI settlements"
                    );
                    logger.info(
                        `🔗 ClearNode: ${process.env.YELLOW_CLEARNODE_URL}`
                    );
                } catch (error) {
                    logger.warn(
                        "⚠️ Yellow Network connection failed, continuing with traditional flow:",
                        error.message
                    );
                }
            } else {
                logger.info("🔒 Yellow Network integration disabled");
                logger.info(
                    "💡 Set YELLOW_ENABLED=true to enable instant settlements"
                );
            }

            logger.info("🚀 Resolver Bot is now running 24x7!");
            logger.info("Press Ctrl+C to stop the bot");

            // Handle graceful shutdown
            process.on("SIGINT", async () => {
                logger.info("\n📴 Received shutdown signal...");
                await this.stopListening();
                process.exit(0);
            });

            process.on("SIGTERM", async () => {
                logger.info("\n📴 Received termination signal...");
                await this.stopListening();
                process.exit(0);
            });

            // Keep the process alive
            process.on("uncaughtException", (error) => {
                logger.error("Uncaught Exception:", error);
                process.exit(1);
            });

            process.on("unhandledRejection", (reason, promise) => {
                logger.error(
                    "Unhandled Rejection at:",
                    promise,
                    "reason:",
                    reason
                );
            });
        } catch (error) {
            logger.error("Failed to start Resolver Bot:", error);
            process.exit(1);
        }
    }
}

// Create and start the bot
const resolverBot = new ResolverBot();
resolverBot.start();

module.exports = ResolverBot;
