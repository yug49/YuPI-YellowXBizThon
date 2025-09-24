const axios = require("axios");

const API_BASE_URL = "http://localhost:5001/api";

async function testSimpleDutchAuctionFlow() {
    console.log("🚀 Testing Dutch Auction Flow");

    // Step 1: Create a mock order in the backend database
    console.log("\n📝 Step 1: Creating order in database...");
    const orderId = `0x${Math.random()
        .toString(16)
        .substr(2, 64)
        .padEnd(64, "0")}`;
    const transactionHash = `0x${"a".repeat(64)}`; // Valid 64-char hex hash

    const orderData = {
        orderId: orderId,
        walletAddress: "0x1234567890123456789012345678901234567890",
        amount: "100.00",
        tokenAddress: "0x11fE4B6AE13d2a6055C8D9cF65c55bac32B5d844", // MockUSDC
        startPrice: "90.00",
        endPrice: "80.00",
        recipientUpiAddress: "test@paytm",
        transactionHash: transactionHash,
        blockNumber: 12345,
    };

    try {
        const createResponse = await axios.post(
            `${API_BASE_URL}/orders`,
            orderData
        );
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

    // Step 2: Start the Dutch auction
    console.log("\n🎯 Step 2: Starting Dutch auction...");
    try {
        const startResponse = await axios.post(
            `${API_BASE_URL}/orders/${orderId}/start-auction`
        );
        console.log("✅ Auction started successfully");
        console.log("🔥 Auction details:", startResponse.data);
    } catch (error) {
        console.error(
            "❌ Failed to start auction:",
            error.response?.data || error.message
        );
        return;
    }

    // Step 3: Monitor auction status
    console.log("\n📊 Step 3: Monitoring auction for 8 seconds...");
    let auctionCompleted = false;
    const maxChecks = 16; // 8 seconds with 0.5s interval

    for (let i = 0; i < maxChecks && !auctionCompleted; i++) {
        await new Promise((resolve) => setTimeout(resolve, 500));

        try {
            const statusResponse = await axios.get(
                `${API_BASE_URL}/orders/${orderId}/auction-status`
            );
            const auction = statusResponse.data.auction;

            if (auction && auction.isActive) {
                console.log(
                    `💰 Current Price: ₹${auction.currentPrice.toFixed(
                        2
                    )} (${auction.progress.toFixed(1)}%)`
                );
            } else if (auction && !auction.isActive && auction.acceptedPrice) {
                console.log(
                    `🎯 Auction accepted at ₹${auction.acceptedPrice}!`
                );
                auctionCompleted = true;
            } else if (auction && !auction.isActive) {
                console.log(
                    `🏁 Auction ended: ${auction.reason || "completed"}`
                );
                auctionCompleted = true;
            }
        } catch (error) {
            console.error(
                "❌ Failed to get auction status:",
                error.response?.data || error.message
            );
        }
    }

    // Step 4: Check final order status
    console.log("\n📋 Step 4: Checking final order status...");
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

        if (order.status === "accepted") {
            console.log("\n🎉 SUCCESS: Dutch auction completed successfully!");
            console.log(
                "✅ Resolver bot successfully participated and accepted the auction"
            );
        } else {
            console.log(
                "\n⏰ Auction completed without acceptance (this is normal if resolver didn't participate)"
            );
        }
    } catch (error) {
        console.error(
            "❌ Failed to get order status:",
            error.response?.data || error.message
        );
    }

    console.log("\n🏁 Dutch auction test completed!");
}

// Run the test
testSimpleDutchAuctionFlow().catch(console.error);
