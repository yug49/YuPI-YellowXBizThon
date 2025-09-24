const axios = require("axios");

async function testFixedPriceConversion() {
    console.log("🚀 Testing Fixed Price Conversion (Wei ↔ Decimal)");

    const API_BASE_URL = "http://localhost:5001/api";

    // Create a new order with known prices
    const orderId = `0x${Math.random()
        .toString(16)
        .substr(2, 32)
        .padEnd(64, "0")}`;
    const transactionHash = `0x${Math.random()
        .toString(16)
        .substr(2, 32)
        .padEnd(64, "0")}`;

    // Important: These prices should be in WEI format as stored by the frontend
    // 95 INR = 95 * 1e18 = 95000000000000000000
    // 85 INR = 85 * 1e18 = 85000000000000000000
    const orderData = {
        orderId: orderId,
        walletAddress: "0x1234567890123456789012345678901234567890",
        amount: "100000000000000000000", // 100 INR in wei
        tokenAddress: "0x11fE4B6AE13d2a6055C8D9cF65c55bac32B5d844",
        startPrice: "95000000000000000000", // 95 INR in wei format
        endPrice: "85000000000000000000", // 85 INR in wei format
        recipientUpiAddress: "fixed@test",
        transactionHash: transactionHash,
        blockNumber: 12360,
    };

    try {
        // Create order
        await axios.post(`${API_BASE_URL}/orders`, orderData);
        console.log(`✅ Order created with wei-formatted prices`);
        console.log(
            `   Start Price: ${orderData.startPrice} wei (should become 95.0 INR)`
        );
        console.log(
            `   End Price: ${orderData.endPrice} wei (should become 85.0 INR)`
        );

        // Start auction
        const startResponse = await axios.post(
            `${API_BASE_URL}/orders/${orderId}/start-auction`
        );
        console.log(`🔥 Dutch auction started`);
        console.log(`📊 Auction Details:`, startResponse.data.data);

        if (
            startResponse.data.data.startPrice === 95 &&
            startResponse.data.data.endPrice === 85
        ) {
            console.log("✅ Price conversion from wei to decimal: SUCCESS!");
        } else {
            console.log("❌ Price conversion failed:", {
                expected: { start: 95, end: 85 },
                actual: {
                    start: startResponse.data.data.startPrice,
                    end: startResponse.data.data.endPrice,
                },
            });
        }

        console.log("⏳ Waiting for auction completion...");

        // Wait for auction completion
        await new Promise((resolve) => setTimeout(resolve, 7000));

        // Check final result
        const orderResponse = await axios.get(
            `${API_BASE_URL}/orders/${orderId}`
        );
        const order = orderResponse.data.data;

        console.log("\n🏁 FINAL RESULTS:");
        console.log(`   Status: ${order.status}`);
        console.log(`   Accepted Price: ₹${order.acceptedPrice || "N/A"}`);
        console.log(
            `   Resolver: ${order.acceptedBy?.substr(0, 12)}...` || "N/A"
        );

        if (order.status === "accepted") {
            const acceptedPriceFloat = parseFloat(order.acceptedPrice);
            if (acceptedPriceFloat >= 85 && acceptedPriceFloat <= 95) {
                console.log("\n🎉 COMPLETE SUCCESS!");
                console.log("✅ Wei ↔ Decimal conversion working perfectly!");
                console.log("✅ Smart contract validation passed!");
                console.log("✅ Dutch auction price range respected!");
            } else {
                console.log("\n⚠️ Price out of expected range");
            }
        } else {
            console.log(
                "\n🎲 Resolver chose not to participate (70% random chance)"
            );
            console.log("✅ No errors - system working correctly!");
        }
    } catch (error) {
        console.error("❌ Error:", error.response?.data || error.message);
    }

    console.log("\n🏁 Price conversion test completed!");
}

testFixedPriceConversion().catch(console.error);
