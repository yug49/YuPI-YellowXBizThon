require("dotenv").config();

async function debugAuthTest() {
    console.log("🔧 Testing RazorpayX Authentication...");
    console.log("Key ID:", process.env.RAZORPAYX_KEY_ID);
    console.log("Key Secret exists:", !!process.env.RAZORPAYX_KEY_SECRET);
    console.log("Account Number:", process.env.RAZORPAYX_ACCOUNT_NUMBER);

    const axios = require("axios");

    try {
        const response = await axios.post(
            "https://api.razorpay.com/v1/contacts",
            {
                name: "Test User",
                email: "test@example.com",
                type: "customer",
                reference_id: "test123",
            },
            {
                auth: {
                    username: process.env.RAZORPAYX_KEY_ID,
                    password: process.env.RAZORPAYX_KEY_SECRET,
                },
                headers: {
                    "Content-Type": "application/json",
                },
            }
        );

        console.log("✅ Contact created successfully!");
        console.log("Contact ID:", response.data.id);
    } catch (error) {
        console.log("❌ Error occurred:");
        console.log("Type:", typeof error);
        console.log("Message:", error.message);
        console.log("Has response:", !!error.response);

        if (error.response) {
            console.log("Status:", error.response.status);
            console.log("Data:", JSON.stringify(error.response.data, null, 2));
        }
    }
}

debugAuthTest();
