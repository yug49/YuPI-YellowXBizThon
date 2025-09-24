// Yellow Network Performance Dashboard for Demo
// Phase 3.3: Demo Flow Optimization

const express = require("express");
const path = require("path");
const WebSocket = require("ws");

class PerformanceDashboard {
    constructor() {
        this.app = express();
        this.server = null;
        this.wss = null;
        this.metrics = {
            totalOrders: 0,
            yellowNetworkOrders: 0,
            standardOrders: 0,
            averageProcessingTime: 0,
            averageYellowTime: 0,
            averageStandardTime: 0,
            performanceImprovement: 0,
            realtimeStats: [],
        };
        this.setupRoutes();
    }

    setupRoutes() {
        // Serve static dashboard files
        this.app.use(express.static(path.join(__dirname, "dashboard")));
        this.app.use(express.json());

        // API endpoints for demo data
        this.app.get("/api/metrics", (req, res) => {
            res.json(this.getMetrics());
        });

        this.app.get("/api/demo-data", (req, res) => {
            res.json(this.generateDemoData());
        });

        this.app.post("/api/simulate-order", (req, res) => {
            const result = this.simulateOrderProcessing(req.body);
            res.json(result);
        });

        // WebSocket for real-time updates
        this.setupWebSocket();
    }

    setupWebSocket() {
        this.wss = new WebSocket.Server({ port: 8081 });

        this.wss.on("connection", (ws) => {
            console.log("📊 Dashboard client connected");

            // Send initial metrics
            ws.send(
                JSON.stringify({
                    type: "metrics",
                    data: this.getMetrics(),
                })
            );

            // Send real-time updates every 2 seconds
            const interval = setInterval(() => {
                if (ws.readyState === WebSocket.OPEN) {
                    ws.send(
                        JSON.stringify({
                            type: "update",
                            data: this.generateRealtimeUpdate(),
                        })
                    );
                }
            }, 2000);

            ws.on("close", () => {
                clearInterval(interval);
                console.log("📊 Dashboard client disconnected");
            });
        });
    }

    generateDemoData() {
        const orders = [];
        const now = Date.now();

        // Create mock historical data
        for (let i = 0; i < 50; i++) {
            const isYellow = Math.random() > 0.3; // 70% use Yellow Network
            const baseTime = isYellow ? 3000 : 22000; // 3s vs 22s
            const variation = Math.random() * 2000 - 1000; // ±1s variation
            const processingTime = Math.max(1000, baseTime + variation);

            orders.push({
                id: `ORDER_${1000 + i}`,
                timestamp: now - i * 60000, // 1 minute apart
                amount: Math.floor(Math.random() * 5000) + 100,
                type: isYellow ? "yellow" : "standard",
                processingTime,
                status: "completed",
                recipient: `user${i}@paytm`,
                performanceGain: isYellow
                    ? Math.max(0, 22000 - processingTime)
                    : 0,
            });
        }

        return orders.sort((a, b) => b.timestamp - a.timestamp);
    }

    simulateOrderProcessing(orderData) {
        const { amount, recipient, useYellow = true } = orderData;
        const orderId = `DEMO_${Date.now()}`;

        const startTime = Date.now();
        const isYellow = useYellow && Math.random() > 0.1; // 90% success rate for Yellow

        // Simulate processing
        const baseTime = isYellow ? 3500 : 21000;
        const variation = Math.random() * 1500;
        const processingTime = baseTime + variation;

        const result = {
            orderId,
            amount,
            recipient,
            type: isYellow ? "yellow" : "standard",
            processingTime,
            startTime,
            endTime: startTime + processingTime,
            performanceGain: isYellow ? Math.max(0, 21000 - processingTime) : 0,
            status: "processing",
        };

        // Update metrics
        this.updateMetrics(result);

        // Broadcast to connected clients
        this.broadcastUpdate(result);

        // Simulate completion after processing time
        setTimeout(() => {
            result.status = "completed";
            result.endTime = Date.now();
            this.broadcastUpdate(result);
        }, Math.min(processingTime, 5000)); // Cap demo time at 5s

        return result;
    }

    updateMetrics(order) {
        this.metrics.totalOrders++;

        if (order.type === "yellow") {
            this.metrics.yellowNetworkOrders++;
            this.metrics.averageYellowTime =
                (this.metrics.averageYellowTime *
                    (this.metrics.yellowNetworkOrders - 1) +
                    order.processingTime) /
                this.metrics.yellowNetworkOrders;
        } else {
            this.metrics.standardOrders++;
            this.metrics.averageStandardTime =
                (this.metrics.averageStandardTime *
                    (this.metrics.standardOrders - 1) +
                    order.processingTime) /
                this.metrics.standardOrders;
        }

        this.metrics.averageProcessingTime =
            (this.metrics.averageYellowTime * this.metrics.yellowNetworkOrders +
                this.metrics.averageStandardTime *
                    this.metrics.standardOrders) /
            this.metrics.totalOrders;

        if (this.metrics.averageStandardTime > 0) {
            this.metrics.performanceImprovement =
                ((this.metrics.averageStandardTime -
                    this.metrics.averageYellowTime) /
                    this.metrics.averageStandardTime) *
                100;
        }

        // Keep recent stats for trending
        this.metrics.realtimeStats.push({
            timestamp: Date.now(),
            ...order,
        });

        // Keep only last 100 stats
        if (this.metrics.realtimeStats.length > 100) {
            this.metrics.realtimeStats.shift();
        }
    }

    generateRealtimeUpdate() {
        // Simulate random order activity for demo
        if (Math.random() > 0.7) {
            return this.simulateOrderProcessing({
                amount: Math.floor(Math.random() * 3000) + 200,
                recipient: `demo${Math.floor(Math.random() * 1000)}@upi`,
                useYellow: Math.random() > 0.2,
            });
        }

        return { type: "heartbeat", timestamp: Date.now() };
    }

    broadcastUpdate(data) {
        const message = JSON.stringify({
            type: "order_update",
            data,
        });

        this.wss.clients.forEach((client) => {
            if (client.readyState === WebSocket.OPEN) {
                client.send(message);
            }
        });
    }

    getMetrics() {
        return {
            ...this.metrics,
            timestamp: Date.now(),
            uptime: process.uptime(),
            version: "3.3.0",
        };
    }

    start(port = 8080) {
        this.server = this.app.listen(port, () => {
            console.log(
                `📊 Performance Dashboard running on http://localhost:${port}`
            );
            console.log(`🔗 WebSocket server running on ws://localhost:8081`);
            console.log(`🟡 Yellow Network Demo Mode Active`);
        });

        // Generate some initial demo data
        this.generateInitialMetrics();
    }

    generateInitialMetrics() {
        // Simulate some historical performance
        this.metrics.totalOrders = 847;
        this.metrics.yellowNetworkOrders = 623;
        this.metrics.standardOrders = 224;
        this.metrics.averageYellowTime = 3247;
        this.metrics.averageStandardTime = 21834;
        this.metrics.averageProcessingTime = 8156;
        this.metrics.performanceImprovement = 85.1;
    }

    stop() {
        if (this.server) {
            this.server.close();
        }
        if (this.wss) {
            this.wss.close();
        }
    }
}

module.exports = PerformanceDashboard;

// Demo startup
if (require.main === module) {
    const dashboard = new PerformanceDashboard();
    dashboard.start();

    process.on("SIGINT", () => {
        console.log("\n🛑 Shutting down dashboard...");
        dashboard.stop();
        process.exit(0);
    });
}
