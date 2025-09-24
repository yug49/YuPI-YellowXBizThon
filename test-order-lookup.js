const axios = require("axios");

async function testOrderContract() {
    console.log("🔍 Testing Contract Order Lookup...");

    // Test with our backend API
    const orderId =
        "0x5076471050bef9cb84f7a093c2f6949b7218057a75f50051877a45f275b2da3d";

    try {
        console.log(`📋 Looking up order: ${orderId}`);

        const response = await axios.get(
            `http://localhost:5001/api/orders/${orderId}`,
            {
                timeout: 30000,
            }
        );

        console.log("✅ Order found via API:");
        console.log("Status:", response.status);
        console.log("Data:", JSON.stringify(response.data, null, 2));
    } catch (error) {
        console.error("❌ Error looking up order:");
        if (error.response) {
            console.error("Status:", error.response.status);
            console.error(
                "Data:",
                JSON.stringify(error.response.data, null, 2)
            );
        } else {
            console.error("Error:", error.message);
        }
    }
}

testOrderContract();
