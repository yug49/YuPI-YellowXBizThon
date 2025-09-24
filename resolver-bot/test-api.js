const axios = require("axios");
require("dotenv").config();

async function testAcceptOrderAPI() {
    console.log("🧪 Testing Accept Order API...\n");

    try {
        const backendUrl = process.env.BACKEND_URL || "http://localhost:5001";

        // Test order acceptance API
        const testOrderId =
            "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef";
        const testAcceptedPrice = "150000000000000000000"; // 150 INR in wei
        const testResolverAddress =
            "0xb862825240fC768515A26D09FAeB9Ab3236Df09e"; // Resolver address

        console.log("📋 Test Parameters:");
        console.log(`Backend URL: ${backendUrl}`);
        console.log(`Order ID: ${testOrderId}`);
        console.log(`Accepted Price: ${testAcceptedPrice}`);
        console.log(`Resolver Address: ${testResolverAddress}`);
        console.log("");

        const apiEndpoint = `${backendUrl}/api/orders/${testOrderId}/accept`;

        const requestPayload = {
            acceptedPrice: testAcceptedPrice,
            resolverAddress: testResolverAddress,
        };

        console.log(`🔗 Making request to: ${apiEndpoint}`);
        console.log(`📦 Request payload:`, requestPayload);
        console.log("");

        const response = await axios.post(apiEndpoint, requestPayload, {
            headers: {
                "Content-Type": "application/json",
            },
            timeout: 30000,
        });

        console.log("✅ API Response:");
        console.log(`Status: ${response.status}`);
        console.log(`Success: ${response.data.success}`);
        console.log(`Message: ${response.data.message}`);

        if (response.data.data) {
            console.log("📊 Transaction Details:");
            console.log(
                `Transaction Hash: ${response.data.data.transactionHash}`
            );
            console.log(`Block Number: ${response.data.data.blockNumber}`);
            console.log(`Gas Used: ${response.data.data.gasUsed}`);
        }

        console.log("\n🎉 API test completed successfully!");
    } catch (error) {
        console.error("\n❌ API test failed:");

        if (error.response) {
            console.error(`Status: ${error.response.status}`);
            console.error(`Error:`, error.response.data);
        } else if (error.code === "ECONNREFUSED") {
            console.error(
                "Cannot connect to backend server. Is it running on port 5001?"
            );
            console.log("\n💡 To start the backend:");
            console.log("cd ../backend && npm start");
        } else {
            console.error("Error:", error.message);
        }
    }
}

// Run the test if this file is executed directly
if (require.main === module) {
    testAcceptOrderAPI();
}

module.exports = testAcceptOrderAPI;
