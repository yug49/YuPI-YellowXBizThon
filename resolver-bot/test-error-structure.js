require("dotenv").config();
const axios = require("axios");

async function testRazorpayError() {
    try {
        // Try to create contact with invalid data to see error structure
        const response = await axios.post(
            "https://api.razorpay.com/v1/contacts",
            {
                name: "", // Invalid empty name
                email: "invalid-email", // Invalid email
                type: "customer",
            },
            {
                auth: {
                    username: process.env.RAZORPAY_KEY_ID,
                    password: process.env.RAZORPAY_KEY_SECRET,
                },
                headers: {
                    "Content-Type": "application/json",
                },
            }
        );
    } catch (error) {
        console.log("\n🔍 Full Error Object:");
        console.log(JSON.stringify(error, null, 2));

        console.log("\n🔍 Error Response:");
        console.log(JSON.stringify(error.response?.data, null, 2));

        console.log("\n🔍 Error Message:");
        console.log(error.message);

        console.log("\n🔍 Error Response Status:");
        console.log(error.response?.status);

        console.log("\n🔍 Checking error.response.data.error:");
        console.log(error.response?.data?.error);

        console.log("\n🔍 Checking error.response.data.error?.description:");
        console.log(error.response?.data?.error?.description);
    }
}

testRazorpayError();
