const axios = require("axios");

const API_BASE_URL = "http://localhost:5001/api";

async function testDutchAuctionAPI() {
    console.log("🚀 Testing Dutch Auction API Flow");

    // Step 1: Create order with Dutch auction
    console.log("\n📝 Creating order with Dutch auction...");
    const orderData = {
        makerName: "Test Maker Flow",
        makerContact: "+919876543210",
        makerUPI: "testflow@upi",
        walletAddress: "0x1234567890123456789012345678901234567890",
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
        console.log(`✅ Order created: ${orderId}`);
        console.log(
            `📊 Auction: ₹${orderData.startPrice} → ₹${orderData.endPrice}`
        );
    } catch (error) {
        console.error(
            "❌ Failed to create order:",
            error.response?.data || error.message
        );
        return;
    }

    // Step 2: Start the Dutch auction
    console.log("\n🎯 Starting Dutch auction...");
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
        return;
    }

    // Step 3: Check auction status
    console.log("\n📊 Checking auction status...");
    try {
        const statusResponse = await axios.get(
            `${API_BASE_URL}/orders/${orderId}/auction-status`
        );
        console.log("📋 Auction Status:", statusResponse.data);
    } catch (error) {
        console.error(
            "❌ Failed to get auction status:",
            error.response?.data || error.message
        );
    }

    // Step 4: Wait a moment for potential resolver acceptance
    console.log("\n⏳ Waiting 8 seconds for potential resolver acceptance...");
    await new Promise((resolve) => setTimeout(resolve, 8000));

    // Step 5: Check final order status
    console.log("\n📋 Checking final order status...");
    try {
        const orderResponse = await axios.get(
            `${API_BASE_URL}/orders/${orderId}`
        );
        const order = orderResponse.data.data;
        console.log(`📋 Status: ${order.status}`);
        console.log(`💰 Final Price: ₹${order.acceptedPrice || "N/A"}`);
        console.log(`🤖 Accepted By: ${order.acceptedBy || "N/A"}`);
        console.log(`⏱️  Accepted At: ${order.acceptedAt || "N/A"}`);
        console.log(`🏁 Auction Active: ${order.auctionActive}`);
    } catch (error) {
        console.error(
            "❌ Failed to get order status:",
            error.response?.data || error.message
        );
    }

    console.log("\n🏁 Test completed!");
}

// Run the test
testDutchAuctionAPI().catch(console.error);
