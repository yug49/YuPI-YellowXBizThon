const axios = require("axios");

async function testBlockchainOnlyFlow() {
    console.log("🔗 Testing Pure Blockchain Order Acceptance");
    console.log("==========================================");

    const API_BASE_URL = "http://localhost:5001/api";

    // Test with a known blockchain order ID that the resolver detected
    const blockchainOrderId =
        "0x3a3d6ac3379a4fd4f15776162dc0f3f2377d842883f91909e7d468175c489f7a";
    const acceptedPrice = "84404126514302625792"; // Wei format price from resolver
    const resolverAddress = "0xb862825240fC768515A26D09FAeB9Ab3236Df09e";

    console.log(`📋 Order ID: ${blockchainOrderId}`);
    console.log(`💰 Accepted Price: ${acceptedPrice} (wei format)`);
    console.log(`🤖 Resolver: ${resolverAddress}`);

    try {
        console.log("\n📤 Attempting to accept blockchain order...");

        const response = await axios.post(
            `${API_BASE_URL}/orders/${blockchainOrderId}/accept`,
            {
                acceptedPrice: acceptedPrice,
                resolverAddress: resolverAddress,
            }
        );

        console.log("✅ SUCCESS! Order accepted via pure blockchain flow");
        console.log(`   Response: ${response.data.message}`);
        console.log(
            `   Transaction Hash: ${
                response.data.data?.transactionHash || "N/A"
            }`
        );
    } catch (error) {
        console.error("❌ FAILED to accept blockchain order");
        console.error(`   Status: ${error.response?.status}`);
        console.error(
            `   Error: ${error.response?.data?.message || error.message}`
        );

        if (error.response?.data?.error) {
            console.error(`   Type: ${error.response.data.error}`);
        }
    }

    console.log("\n🎯 Expected Result:");
    console.log("   ✅ Backend reads order from blockchain (no database)");
    console.log("   ✅ Price validation passes");
    console.log("   ✅ Smart contract call succeeds");
    console.log("   ✅ Transaction hash returned");
    console.log("   ✅ No database dependencies");
}

testBlockchainOnlyFlow().catch(console.error);
