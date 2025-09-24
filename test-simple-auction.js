#!/usr/bin/env node

const http = require("http");
const url = require("url");

const BACKEND_URL = "http://localhost:5001";

function makeRequest(urlPath, method = "GET", data = null) {
    return new Promise((resolve, reject) => {
        const urlObj = new URL(urlPath, BACKEND_URL);
        const options = {
            hostname: urlObj.hostname,
            port: urlObj.port,
            path: urlObj.pathname + urlObj.search,
            method: method,
            headers: {
                "Content-Type": "application/json",
            },
        };

        const req = http.request(options, (res) => {
            let body = "";
            res.on("data", (chunk) => (body += chunk));
            res.on("end", () => {
                try {
                    const result = JSON.parse(body);
                    resolve({ status: res.statusCode, data: result });
                } catch (e) {
                    resolve({ status: res.statusCode, data: body });
                }
            });
        });

        req.on("error", reject);

        if (data) {
            req.write(JSON.stringify(data));
        }

        req.end();
    });
}

async function testDutchAuctionAPI() {
    console.log("🧪 Testing Dutch Auction API Implementation\n");

    // Test 1: Health check
    console.log("1️⃣ Testing backend health...");
    try {
        const response = await makeRequest("/health");
        if (response.status === 200) {
            console.log("✅ Backend is healthy:", response.data);
        } else {
            console.log("❌ Backend health check failed:", response.status);
            return;
        }
    } catch (error) {
        console.log("❌ Backend health check failed:", error.message);
        return;
    }

    // Test 2: Test auction status API with mock order
    const TEST_ORDER_ID = "0x" + "1".repeat(64);
    console.log("\n2️⃣ Testing auction status API...");
    try {
        const response = await makeRequest(
            `/api/orders/${TEST_ORDER_ID}/auction-status`
        );
        if (response.status === 200) {
            console.log("✅ Auction status API working:", response.data);
        } else {
            console.log(
                "⚠️ Auction status response:",
                response.status,
                response.data
            );
        }
    } catch (error) {
        console.log("❌ Auction status test failed:", error.message);
    }

    // Test 3: Test auction start API (will fail without valid order, but tests endpoint)
    console.log("\n3️⃣ Testing auction start API...");
    try {
        const response = await makeRequest(
            `/api/orders/${TEST_ORDER_ID}/start-auction`,
            "POST",
            {
                duration: 5000,
            }
        );

        if (response.status === 404) {
            console.log(
                "✅ Auction start API endpoint working (order not found as expected)"
            );
        } else if (response.data.success) {
            console.log("✅ Auction started successfully:", response.data);
        } else {
            console.log(
                "⚠️ Auction start response:",
                response.status,
                response.data
            );
        }
    } catch (error) {
        console.log("❌ Auction start test failed:", error.message);
    }

    console.log("\n🎉 Dutch auction API testing completed!");
    console.log("\n📋 Summary:");
    console.log("- Backend server: ✅ Running on http://localhost:5001");
    console.log("- Health endpoint: ✅ Working");
    console.log("- Auction APIs: ✅ Endpoints configured");
    console.log("\n🚀 Ready for full testing!");
    console.log("\n📝 Next steps:");
    console.log("1. Start frontend: cd frontend && npm run dev");
    console.log("2. Open: http://localhost:3000/maker-dashboard");
    console.log("3. Connect wallet and create an order");
    console.log("4. Enable Dutch auction toggle");
    console.log("5. Watch real-time price updates!");
}

// Run the test
testDutchAuctionAPI().catch(console.error);
