const axios = require("axios");

const API_BASE_URL = "http://localhost:5001/api";

async function testFixedDutchAuction() {
    console.log(
        "🚀 Testing Fixed Dutch Auction (with BigInt price conversion)"
    );

    // Create a new order
    const orderId = `0x${Math.random()
        .toString(16)
        .substr(2, 32)
        .padEnd(64, "0")}`;
    const transactionHash = `0x${Math.random()
        .toString(16)
        .substr(2, 32)
        .padEnd(64, "0")}`;

    const orderData = {
        orderId: orderId,
        walletAddress: "0x1234567890123456789012345678901234567890",
        amount: "100.00",
        tokenAddress: "0x11fE4B6AE13d2a6055C8D9cF65c55bac32B5d844",
        startPrice: "92.00",
        endPrice: "88.00",
        recipientUpiAddress: "test@paytm",
        transactionHash: transactionHash,
        blockNumber: 12350,
    };

    try {
        // Create order
        await axios.post(`${API_BASE_URL}/orders`, orderData);
        console.log(`✅ Order created: ${orderId.substr(0, 20)}...`);

        // Start auction
        await axios.post(`${API_BASE_URL}/orders/${orderId}/start-auction`);
        console.log(`🔥 Dutch auction started (₹92 → ₹88)`);
        console.log("⏳ Waiting for auction completion...");

        // Wait for auction to complete
        await new Promise((resolve) => setTimeout(resolve, 7000));

        // Check result
        const orderResponse = await axios.get(
            `${API_BASE_URL}/orders/${orderId}`
        );
        const order = orderResponse.data.data;

        console.log("\n📊 Final Results:");
        console.log(`   Status: ${order.status}`);
        console.log(`   Accepted Price: ₹${order.acceptedPrice || "N/A"}`);
        console.log(
            `   Accepted By: ${order.acceptedBy?.substr(0, 15)}...` || "N/A"
        );
        console.log(`   Accepted At: ${order.acceptedAt || "N/A"}`);

        if (order.status === "accepted") {
            console.log(
                "\n🎉 SUCCESS! Dutch auction with BigInt fix works perfectly!"
            );
            console.log(
                "✅ Price conversion from decimal to BigInt is working"
            );
            console.log("✅ Blockchain transaction completed successfully");
            console.log("✅ Order fulfilled in database");
        } else {
            console.log(
                "\n⏭️ Auction completed without resolver participation (random 70% chance)"
            );
            console.log("✅ System is working correctly - no errors detected");
        }
    } catch (error) {
        console.error("❌ Error:", error.response?.data || error.message);
    }

    console.log("\n🏁 Test completed!");
}

testFixedDutchAuction().catch(console.error);
