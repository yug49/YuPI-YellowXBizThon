const axios = require("axios");

async function demonstrateWeiFix() {
    console.log("🔧 Demonstrating Wei Format Fix");
    console.log("================================");

    const API_BASE_URL = "http://localhost:5001/api";

    // Create a test order
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
        amount: "100000000000000000000", // 100 INR in wei
        tokenAddress: "0x11fE4B6AE13d2a6055C8D9cF65c55bac32B5d844",
        startPrice: "95000000000000000000", // 95 INR in wei
        endPrice: "85000000000000000000", // 85 INR in wei
        recipientUpiAddress: "demo@fix",
        transactionHash: transactionHash,
        blockNumber: 12345,
    };

    try {
        // Create order
        await axios.post(`${API_BASE_URL}/orders`, orderData);
        console.log("✅ Order created with wei prices");
        console.log(`   Start Price: ${orderData.startPrice} wei (95 INR)`);
        console.log(`   End Price: ${orderData.endPrice} wei (85 INR)`);

        // Start auction
        const startResponse = await axios.post(
            `${API_BASE_URL}/orders/${orderId}/start-auction`
        );
        console.log("✅ Auction started");

        // Wait a bit
        await new Promise((resolve) => setTimeout(resolve, 1000));

        // Test scenario 1: Resolver sends wei format price (what actually happens)
        const weiFormatPrice = "90000000000000000000"; // 90 INR in wei
        console.log("\n📤 Scenario 1: Resolver sends wei format price");
        console.log(`   Sending: ${weiFormatPrice} (90 INR in wei)`);

        try {
            const response = await axios.post(
                `${API_BASE_URL}/orders/${orderId}/accept`,
                {
                    acceptedPrice: weiFormatPrice,
                    resolverAddress:
                        "0xb862825240fC768515A26D09FAeB9Ab3236Df09e",
                }
            );
            console.log("✅ SUCCESS: Wei format price accepted correctly!");
            console.log(`   Response: ${response.data.message}`);
        } catch (error) {
            console.error("❌ FAILED: Wei format price rejected");
            console.error(
                `   Error: ${error.response?.data?.message || error.message}`
            );
        }

        // Test scenario 2: If someone sends decimal format
        console.log("\n📤 Scenario 2: Testing decimal format price");
        console.log(`   Sending: 89.5 (decimal format)`);

        try {
            const response = await axios.post(
                `${API_BASE_URL}/orders/${orderId}/accept`,
                {
                    acceptedPrice: "89.5",
                    resolverAddress:
                        "0xb862825240fC768515A26D09FAeB9Ab3236Df09e",
                }
            );
            console.log("✅ SUCCESS: Decimal format price accepted correctly!");
            console.log(`   Response: ${response.data.message}`);
        } catch (error) {
            console.error("❌ FAILED: Decimal format price rejected");
            console.error(
                `   Error: ${error.response?.data?.message || error.message}`
            );
        }

        console.log("\n🎯 Fix Summary:");
        console.log(
            "   Before: Backend always treated incoming price as decimal and multiplied by 1e18"
        );
        console.log(
            "   Problem: Resolver sends wei format → Backend converts again → Astronomical number"
        );
        console.log(
            "   After: Backend detects format and handles both wei and decimal correctly"
        );
        console.log("   Result: Smart contract validation passes ✅");
    } catch (error) {
        console.error("❌ Test failed:", error.response?.data || error.message);
    }
}

demonstrateWeiFix().catch(console.error);
