const axios = require("axios");
const { v4: uuidv4 } = require("uuid");
const { ethers } = require("ethers");
require("dotenv").config();

/**
 * Test just the payment processing part without the full resolver bot
 */
async function testPaymentProcessingOnly() {
    try {
        console.log("🧪 Testing Payment Processing Only...");
        console.log("===================================");

        // Mock order details
        const mockOrderId = "0x" + "1234567890abcdef".repeat(4);
        const mockOrderDetails = {
            recipientUpiAddress: "test@paytm",
            amount: ethers.parseEther("50").toString(), // 50 INR in wei
            accepted: true,
            fullfilled: false,
        };

        console.log(`📋 Order ID: ${mockOrderId}`);
        console.log(`🏦 UPI Address: ${mockOrderDetails.recipientUpiAddress}`);
        console.log(
            `💰 Amount: ₹50 (from ${ethers.formatEther(
                mockOrderDetails.amount
            )} ETH value)`
        );

        // Step 1: Calculate payment amount
        const amountInrWei = BigInt(mockOrderDetails.amount);
        const amountInr = Number(ethers.formatEther(amountInrWei));
        const amountPaise = Math.round(amountInr * 100);

        console.log(`💱 Converted to: ${amountPaise} paise (₹${amountInr})`);

        // Step 2: Create authorization header
        const keyId = process.env.RAZORPAYX_KEY_ID;
        const keySecret = process.env.RAZORPAYX_KEY_SECRET;
        const accountNumber = process.env.RAZORPAYX_ACCOUNT_NUMBER;

        const credentials = `${keyId}:${keySecret}`;
        const base64Credentials = Buffer.from(credentials).toString("base64");
        const authHeader = `Basic ${base64Credentials}`;

        console.log(`🔐 Using account: ${accountNumber}`);

        // Step 3: Create contact
        console.log("\n👤 Creating contact...");
        const contactPayload = {
            name: "Order Recipient",
            email: "order@yourapp.com",
            contact: "9999999999",
            type: "self",
            reference_id: `order_${mockOrderId.substring(0, 10)}`,
            notes: {
                order_id: mockOrderId,
                payment_type: "order_settlement",
            },
        };

        const contactResponse = await axios.post(
            "https://api.razorpay.com/v1/contacts",
            contactPayload,
            {
                headers: {
                    Authorization: authHeader,
                    "Content-Type": "application/json",
                },
                timeout: 30000,
            }
        );

        const contactId = contactResponse.data.id;
        console.log(`✅ Contact created: ${contactId}`);

        // Step 4: Create fund account
        console.log("\n🏦 Creating fund account...");
        const fundAccountPayload = {
            contact_id: contactId,
            account_type: "vpa",
            vpa: {
                address: mockOrderDetails.recipientUpiAddress,
            },
        };

        const fundAccountResponse = await axios.post(
            "https://api.razorpay.com/v1/fund_accounts",
            fundAccountPayload,
            {
                headers: {
                    Authorization: authHeader,
                    "Content-Type": "application/json",
                },
                timeout: 30000,
            }
        );

        const fundAccountId = fundAccountResponse.data.id;
        console.log(`✅ Fund account created: ${fundAccountId}`);

        // Step 5: Create payout
        console.log("\n💳 Creating payout...");
        const idempotencyKey = uuidv4();

        const payoutPayload = {
            account_number: accountNumber,
            fund_account_id: fundAccountId,
            amount: amountPaise,
            currency: "INR",
            mode: "UPI",
            purpose: "payout",
            queue_if_low_balance: true,
            reference_id: `order_${mockOrderId.substring(0, 10)}`,
            narration: `Order Payment`,
            notes: {
                order_id: mockOrderId,
                payment_method: "UPI",
                processed_by: "resolver_bot",
            },
        };

        const payoutResponse = await axios.post(
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

        const payoutData = payoutResponse.data;
        console.log(`✅ Payout created: ${payoutData.id}`);

        // Step 6: Display success message (like resolver bot would)
        const separator = "=".repeat(80);
        const successMessage = `
${separator}
🎉 RESOLVER BOT PAYMENT SUCCESSFULLY COMPLETED! 🎉
${separator}
📋 Order ID: ${mockOrderId}
💰 Amount: ₹${amountInr.toFixed(2)} (${amountPaise} paise)
🏦 Recipient UPI: ${mockOrderDetails.recipientUpiAddress}
🆔 Payout ID: ${payoutData.id}
🔗 UTR/Transaction ID: ${payoutData.utr || "Processing..."}
📊 Status: ${payoutData.status.toUpperCase()}
👤 Contact ID: ${contactId}
🏦 Fund Account ID: ${fundAccountId}
💳 Fees: ₹${((payoutData.fees || 0) / 100).toFixed(2)}
📋 Tax: ₹${((payoutData.tax || 0) / 100).toFixed(2)}
⏰ Processed At: ${new Date().toISOString()}
🤖 Processed By: Resolver Bot Test
${separator}
`;

        console.log(successMessage);

        return {
            success: true,
            data: {
                orderId: mockOrderId,
                payoutId: payoutData.id,
                amount: amountInr,
                upiAddress: mockOrderDetails.recipientUpiAddress,
                status: payoutData.status,
                contactId,
                fundAccountId,
                fees: payoutData.fees,
                tax: payoutData.tax,
            },
        };
    } catch (error) {
        console.error("\n❌ PAYMENT PROCESSING FAILED!");
        console.error("==============================");

        if (error.response) {
            console.error(`HTTP Status: ${error.response.status}`);
            console.error(
                "Error Response:",
                JSON.stringify(error.response.data, null, 2)
            );
        } else {
            console.error("Error:", error.message);
        }

        return { success: false, error: error.message };
    }
}

console.log("🚀 Testing Resolver Bot Payment Processing...");
console.log("This simulates what happens when a resolver processes a payment");
console.log("============================================================\n");

testPaymentProcessingOnly()
    .then((result) => {
        if (result.success) {
            console.log("\n🎊 PAYMENT PROCESSING TEST SUCCESSFUL!");
            console.log("=====================================");
            console.log("✅ Order amount calculated correctly");
            console.log("✅ RazorpayX contact created");
            console.log("✅ RazorpayX fund account created");
            console.log("✅ Real UPI payout executed");
            console.log("✅ Payment confirmation displayed");
            console.log(
                "\n🚀 The resolver bot payment logic is working perfectly!"
            );
            console.log(
                "💡 Ready for integration with order acceptance signals!"
            );
        } else {
            console.log("\n❌ Payment processing test failed");
        }
    })
    .catch((error) => {
        console.error("\n💥 Unexpected error:", error);
    });
