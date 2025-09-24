const axios = require("axios");

async function testProofSubmission() {
    console.log("🧪 Testing Proof Submission to Backend...");
    console.log("=====================================");

    // Use a real order ID from our previous tests
    const orderId =
        "0x5076471050bef9cb84f7a093c2f6949b7218057a75f50051877a45f275b2da3d";
    const transactionId = "pout_RKgzmQdPNUiyYo"; // From our previous successful payment
    const resolverAddress = "0xb862825240fC768515A26D09FAeB9Ab3236Df09e";

    try {
        console.log(`📋 Order ID: ${orderId}`);
        console.log(`🔗 Transaction ID: ${transactionId}`);
        console.log(`👤 Resolver: ${resolverAddress}`);
        console.log();

        const response = await axios.post(
            `http://localhost:5001/api/orders/${orderId}/fulfill`,
            {
                transactionId: transactionId,
                resolverAddress: resolverAddress,
            },
            {
                headers: {
                    "Content-Type": "application/json",
                },
                timeout: 60000, // 60 seconds
            }
        );

        console.log("✅ SUCCESS!");
        console.log("Response:", JSON.stringify(response.data, null, 2));
    } catch (error) {
        console.log("❌ ERROR!");
        if (error.response) {
            console.log("Status:", error.response.status);
            console.log("Data:", JSON.stringify(error.response.data, null, 2));
        } else {
            console.log("Error:", error.message);
        }
    }
}

testProofSubmission();
