require("dotenv").config();

console.log("🔍 Debugging RazorpayX Authentication...");
console.log("=========================================");

const keyId = process.env.RAZORPAYX_KEY_ID;
const keySecret = process.env.RAZORPAYX_KEY_SECRET;

console.log(`Raw Key ID: "${keyId}"`);
console.log(`Raw Key Secret: "${keySecret}"`);
console.log(`Key ID Length: ${keyId ? keyId.length : "undefined"}`);
console.log(`Key Secret Length: ${keySecret ? keySecret.length : "undefined"}`);

if (keyId && keySecret) {
    const credentials = `${keyId}:${keySecret}`;
    console.log(`Combined: "${credentials}"`);

    const base64Credentials = Buffer.from(credentials).toString("base64");
    console.log(`Base64: "${base64Credentials}"`);
    console.log(`Auth Header: "Basic ${base64Credentials}"`);

    // Test decode to verify
    const decoded = Buffer.from(base64Credentials, "base64").toString("utf8");
    console.log(`Decoded back: "${decoded}"`);
    console.log(`Matches original: ${decoded === credentials}`);
} else {
    console.log("❌ Missing credentials in environment variables");
}

// Also check account number
const accountNumber = process.env.RAZORPAYX_ACCOUNT_NUMBER;
console.log(`Account Number: "${accountNumber}"`);
console.log(
    `Account Number Length: ${
        accountNumber ? accountNumber.length : "undefined"
    }`
);
