const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const { createServer } = require("http");
const { Server } = require("socket.io");
require("dotenv").config();

const YellowClearNodeConnection = require("./yellow/clearnode-connection.js");

const app = express();
const server = createServer(app);

app.use(helmet());
app.use(
    cors({
        origin: process.env.FRONTEND_URL || "http://localhost:3000",
        credentials: true,
    })
);

const io = new Server(server, {
    cors: {
        origin: process.env.FRONTEND_URL || "http://localhost:3000",
        methods: ["GET", "POST"],
        credentials: true,
    },
});

const limiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
});
app.use(limiter);

app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));

const connectDB = async () => {
    try {
        const conn = await mongoose.connect(
            process.env.MONGODB_URI ||
                "mongodb://localhost:27017/yelloworderprotocol",
            {
                useNewUrlParser: true,
                useUnifiedTopology: true,
            }
        );
        console.log("MongoDB Connected:", conn.connection.host);
    } catch (error) {
        console.error("Database connection error:", error);
        process.exit(1);
    }
};

connectDB();

const yellowConnection = new YellowClearNodeConnection();
yellowConnection.connect().catch((error) => {
    console.error("Failed to initialize Yellow Network connection:", error);
});

app.set("yellowConnection", yellowConnection);

const YellowSessionManager = require("./yellow/session-manager");
const yellowSessionManager = new YellowSessionManager(yellowConnection);
app.set("yellowSessionManager", yellowSessionManager);
console.log("⚡ Yellow Session Manager ready for instant settlements");

class DutchAuctionManager {
    static createAuction() {
        return null;
    }
    static acceptAuction() {
        return { success: false, message: "Dutch auction disabled" };
    }
    static getActiveAuction() {
        return null;
    }
    static getAllActiveAuctions() {
        return [];
    }
}

io.on("connection", (socket) => {
    console.log("🔌 Client connected:", socket.id);
    socket.on("disconnect", () => {
        console.log("🔌 Client disconnected:", socket.id);
    });
});

app.set("auctionManager", DutchAuctionManager);
app.set("socketio", io);

const orderRoutes = require("./routes/orders");
app.use("/api/orders", orderRoutes);

app.get("/health", async (req, res) => {
    const yellowStatus = await yellowConnection.healthCheck();
    res.status(200).json({
        status: "OK",
        timestamp: new Date().toISOString(),
        yellowNetwork: yellowStatus,
        database:
            mongoose.connection.readyState === 1 ? "connected" : "disconnected",
        instantFulfillment: true,
        contracts: {
            orderProtocol: process.env.ORDER_PROTOCOL_ADDRESS,
            makerRegistry: process.env.MAKER_REGISTRY_ADDRESS,
            resolverRegistry: process.env.RESOLVER_REGISTRY_ADDRESS,
        },
    });
});

app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({
        error: "Something went wrong!",
        message:
            process.env.NODE_ENV === "development"
                ? err.message
                : "Internal server error",
    });
});

app.use("*", (req, res) => {
    res.status(404).json({ error: "Route not found" });
});

const PORT = process.env.PORT || 5001;

server.listen(PORT, () => {
    console.log("🚀 Yellow Network Backend Server Started");
    console.log("📍 Port:", PORT);
    console.log("🔗 Contract:", process.env.ORDER_PROTOCOL_ADDRESS);
    console.log("🟡 Yellow Network: Instant fulfillment enabled");
});

module.exports = app;
