const axios = require("axios");
const { io } = require("socket.io-client");

const API_BASE_URL = "http://localhost:5001/api";

async function testCompleteDutchAuctionFlow() {
    console.log("🚀 Testing Complete Dutch Auction Flow with Fulfillment");

    // Step 1: Create order with Dutch auction
    console.log("\n📝 Step 1: Creating order with Dutch auction...");
    const orderData = {
        makerName: "Test Maker",
        makerContact: "+919876543210",
        makerUPI: "test@upi",
        cryptoAmount: "100",
        cryptoType: "USDC",
        exchangeRate: "85.50",
        escrowDuration: "30",
        isDutchAuction: true,
        startPrice: 90.0,
        endPrice: 80.0,
    };

    let orderId;
    try {
        const createResponse = await axios.post(
            `${API_BASE_URL}/orders`,
            orderData
        );
        orderId = createResponse.data.data.orderId;
        console.log(`✅ Order created successfully: ${orderId}`);
        console.log(
            `📊 Start Price: ₹${orderData.startPrice}, End Price: ₹${orderData.endPrice}`
        );
    } catch (error) {
        console.error(
            "❌ Failed to create order:",
            error.response?.data || error.message
        );
        return;
    }

    // Step 2: Connect to Socket.IO to monitor auction
    console.log("\n🔌 Step 2: Connecting to auction server...");
    const socket = io("http://localhost:5001");

    let auctionAccepted = false;
    let orderFulfilled = false;

    socket.on("connect", () => {
        console.log("✅ Connected to auction server");
    });

    socket.on("auctionStarted", (data) => {
        if (data.orderId === orderId) {
            console.log(`🔥 Auction started for order ${orderId}`);
        }
    });

    socket.on("priceUpdate", (data) => {
        if (data.orderId === orderId) {
            console.log(
                `💰 Price update: ₹${data.currentPrice.toFixed(
                    2
                )} (${data.progress.toFixed(1)}% complete)`
            );
        }
    });

    socket.on("auctionAccepted", (data) => {
        if (data.orderId === orderId) {
            console.log(
                `🎯 Auction accepted at ₹${data.acceptedPrice} by resolver`
            );
            auctionAccepted = true;
        }
    });

    socket.on("orderAccepted", (data) => {
        if (data.orderId === orderId) {
            console.log(
                `✅ Order officially accepted by ${data.resolverAddress}`
            );
        }
    });

    socket.on("orderFulfilled", (data) => {
        if (data.orderId === orderId) {
            console.log(`🎉 Order fulfilled!`);
            console.log(`   Payout ID: ${data.payoutId}`);
            console.log(`   Transaction: ${data.transactionHash}`);
            console.log(`   Amount: ₹${data.amount}`);
            orderFulfilled = true;
        }
    });

    socket.on("auctionEnded", (data) => {
        if (data.orderId === orderId) {
            console.log(`🏁 Auction ended: ${data.reason}`);
        }
    });

    // Step 3: Start the Dutch auction
    console.log("\n🎯 Step 3: Starting Dutch auction...");
    try {
        const startResponse = await axios.post(
            `${API_BASE_URL}/orders/${orderId}/start-auction`
        );
        console.log("✅ Auction started successfully");
    } catch (error) {
        console.error(
            "❌ Failed to start auction:",
            error.response?.data || error.message
        );
        socket.disconnect();
        return;
    }

    // Step 4: Wait for auction completion and potential fulfillment
    console.log(
        "\n⏳ Step 4: Waiting for auction completion (up to 15 seconds)..."
    );
    await new Promise((resolve) => {
        const checkTimer = setInterval(() => {
            if (orderFulfilled) {
                console.log("✅ Complete flow successful - Order fulfilled!");
                clearInterval(checkTimer);
                resolve();
            } else if (auctionAccepted) {
                console.log("⏳ Auction accepted, waiting for fulfillment...");
            }
        }, 1000);

        // Timeout after 15 seconds
        setTimeout(() => {
            console.log("⏰ Test completed (timeout)");
            clearInterval(checkTimer);
            resolve();
        }, 15000);
    });

    // Step 5: Check final order status
    console.log("\n📊 Step 5: Checking final order status...");
    try {
        const statusResponse = await axios.get(
            `${API_BASE_URL}/orders/${orderId}`
        );
        const order = statusResponse.data.data;
        console.log(`📋 Final Status: ${order.status}`);
        console.log(`💰 Final Price: ₹${order.acceptedPrice || "N/A"}`);
        console.log(`🤖 Accepted By: ${order.acceptedBy || "N/A"}`);
        console.log(`⏱️  Accepted At: ${order.acceptedAt || "N/A"}`);
    } catch (error) {
        console.error(
            "❌ Failed to get order status:",
            error.response?.data || error.message
        );
    }

    socket.disconnect();
    console.log("\n🏁 Test completed!");
}

// Run the test
testCompleteDutchAuctionFlow().catch(console.error);
