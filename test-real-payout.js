const axios = require("axios");

async function testPayoutVerification() {
    console.log("🔍 Testing RazorpayX Transaction Verification...");
    console.log("📋 Payout ID: pout_RKh1zwbPL0pq9a");

    try {
        // Test the RazorpayX API directly first
        console.log("\n1. Testing direct RazorpayX Payout API call...");

        const response = await axios.get(
            "https://api.razorpay.com/v1/payouts/pout_RKh1zwbPL0pq9a",
            {
                auth: {
                    username: "rzp_test_RKgUYMcFfhOJnh",
                    password: "EkJidQvNEwh4Yv68DB8JhMQ1",
                },
                timeout: 30000,
            }
        );

        console.log("✅ RazorpayX Payout API Response:");
        console.log("Status:", response.status);
        console.log("Payout Details:");
        console.log("- ID:", response.data.id);
        console.log("- Entity:", response.data.entity);
        console.log("- Amount:", response.data.amount, "paise");
        console.log("- Currency:", response.data.currency);
        console.log("- Status:", response.data.status);
        console.log("- UTR:", response.data.utr);
        console.log(
            "- Created At:",
            new Date(response.data.created_at * 1000).toISOString()
        );
        console.log("- Fund Account ID:", response.data.fund_account_id);
        console.log("- Fees:", response.data.fees, "paise");
        console.log("- Tax:", response.data.tax, "paise");

        console.log("\n2. Testing backend fulfillment endpoint...");

        // Test our backend endpoint
        const testOrderId =
            "0x2e3ca2e75fd1b193a8df070bcc33f03d6aa3edfa0e29fe418d881837e0f6da1c";
        const testResolverAddress =
            "0xb862825240fC768515A26D09FAeB9Ab3236Df09e";

        const backendResponse = await axios.post(
            `http://localhost:5001/api/orders/${testOrderId}/fulfill`,
            {
                transactionId: "pout_RKh1zwbPL0pq9a",
                resolverAddress: testResolverAddress,
            },
            {
                headers: {
                    "Content-Type": "application/json",
                },
                timeout: 30000,
            }
        );

        console.log("✅ Backend Response:");
        console.log("Status:", backendResponse.status);
        console.log("Data:", JSON.stringify(backendResponse.data, null, 2));
    } catch (error) {
        console.error("❌ Error during verification:");
        console.error("Message:", error.message);

        if (error.response) {
            console.error("Response Status:", error.response.status);
            console.error(
                "Response Data:",
                JSON.stringify(error.response.data, null, 2)
            );
        }
    }
}

testPayoutVerification();
