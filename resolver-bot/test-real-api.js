const axios = require("axios");
const { v4: uuidv4 } = require("uuid");
require("dotenv").config();

/**
 * Test actual RazorpayX API with a small amount to a test UPI address
 */
async function testRealRazorpayXAPI() {
    try {
        console.log("🧪 Testing Real RazorpayX API...");
        console.log("==================================");

        // Validate environment variables
        const keyId = process.env.RAZORPAYX_KEY_ID;
        const keySecret = process.env.RAZORPAYX_KEY_SECRET;
        const accountNumber = process.env.RAZORPAYX_ACCOUNT_NUMBER;

        if (!keyId || !keySecret || !accountNumber) {
            throw new Error("Missing RazorpayX environment variables");
        }

        console.log(`🔐 Key ID: ${keyId}`);
        console.log(`🏦 Account Number: ${accountNumber}`);

        // Create authorization header
        const credentials = `${keyId}:${keySecret}`;
        const base64Credentials = Buffer.from(credentials).toString("base64");
        const authHeader = `Basic ${base64Credentials}`;

        console.log(
            `🔑 Auth Header: Basic ${base64Credentials.substring(0, 20)}...`
        );

        // Test with a small amount (1 rupee = 100 paise)
        const testAmount = 100; // 1 INR in paise
        const testUpiAddress = "test@paytm"; // Generic test UPI address
        const idempotencyKey = uuidv4();

        console.log(
            `💰 Test Amount: ${testAmount} paise (₹${testAmount / 100})`
        );
        console.log(`🏦 Test UPI: ${testUpiAddress}`);
        console.log(`🆔 Idempotency Key: ${idempotencyKey}`);

        const payoutPayload = {
            account_number: accountNumber,
            amount: testAmount,
            currency: "INR",
            mode: "UPI",
            purpose: "payout",
            fund_account: {
                account_type: "vpa",
                vpa: {
                    address: testUpiAddress,
                },
                contact: {
                    name: "Test User",
                    email: "test@example.com",
                    contact: "9999999999",
                    type: "self",
                    reference_id: `test_${Date.now()}`,
                    notes: {
                        test: "api_test",
                        amount: testAmount.toString(),
                    },
                },
            },
            queue_if_low_balance: true,
            reference_id: `test_payment_${Date.now()}`,
            narration: "API Test Payment",
            notes: {
                test_type: "api_verification",
                processed_by: "resolver_bot_test",
            },
        };

        console.log("\n📤 Making API Call to RazorpayX...");
        console.log("Payload:", JSON.stringify(payoutPayload, null, 2));

        const response = await axios.post(
            "https://api.razorpay.com/v1/payouts",
            payoutPayload,
            {
                headers: {
                    Authorization: authHeader,
                    "Content-Type": "application/json",
                    "X-Payout-Idempotency": idempotencyKey,
                },
                timeout: 30000,
            }
        );

        console.log("\n✅ API Call Successful!");
        console.log("======================================");
        console.log(`Status: ${response.status}`);
        console.log(`Response:`, JSON.stringify(response.data, null, 2));

        const payoutData = response.data;

        console.log("\n🎉 REAL API TEST SUCCESSFUL!");
        console.log("===============================");
        console.log(`💰 Amount: ₹${testAmount / 100} (${testAmount} paise)`);
        console.log(`🏦 Recipient: ${testUpiAddress}`);
        console.log(`🆔 Payout ID: ${payoutData.id}`);
        console.log(`📊 Status: ${payoutData.status}`);
        console.log(`🔗 UTR: ${payoutData.utr || "Processing..."}`);
        console.log(`💳 Fees: ₹${(payoutData.fees || 0) / 100}`);
        console.log(`📋 Tax: ₹${(payoutData.tax || 0) / 100}`);
        console.log(
            `⏰ Created: ${new Date(
                payoutData.created_at * 1000
            ).toISOString()}`
        );

        if (payoutData.status === "processed") {
            console.log("\n🎊 Payment processed successfully!");
        } else if (payoutData.status === "processing") {
            console.log("\n⏳ Payment is being processed...");
        } else if (payoutData.status === "queued") {
            console.log("\n📋 Payment is queued for processing...");
        }

        return {
            success: true,
            data: payoutData,
        };
    } catch (error) {
        console.error("\n❌ API Test Failed!");
        console.error("====================");

        if (error.response) {
            const { status, data } = error.response;
            console.error(`HTTP Status: ${status}`);
            console.error(`Error Response:`, JSON.stringify(data, null, 2));

            if (status === 400) {
                console.error("\n🔍 Possible Issues:");
                console.error("- Invalid UPI address format");
                console.error("- Invalid account number");
                console.error("- Missing required fields");
            } else if (status === 401) {
                console.error("\n🔍 Authentication Issue:");
                console.error("- Check your API key and secret");
                console.error("- Verify credentials are correct");
            } else if (status === 402) {
                console.error("\n🔍 Payment Issue:");
                console.error("- Insufficient balance in account");
                console.error("- Payment limit exceeded");
            }
        } else if (error.code === "ECONNREFUSED") {
            console.error("\n🌐 Network Issue:");
            console.error("- Cannot connect to RazorpayX API");
            console.error("- Check internet connection");
        } else {
            console.error(`\n📋 Error: ${error.message}`);
        }

        return {
            success: false,
            error: error.message,
            details: error.response?.data,
        };
    }
}

// Run the test
console.log("🚀 Starting Real RazorpayX API Test...");
console.log("Note: This will make an actual API call with real test funds");
console.log("======================================================\n");

testRealRazorpayXAPI()
    .then((result) => {
        if (result.success) {
            console.log("\n✅ Test completed successfully!");
            console.log(
                "🔧 The RazorpayX API integration is working correctly!"
            );
        } else {
            console.log("\n❌ Test failed!");
            console.log(
                "🔧 Please check the error details above and fix the issues."
            );
        }
    })
    .catch((error) => {
        console.error("\n💥 Unexpected error:", error);
    });
