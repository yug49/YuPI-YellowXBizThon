const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const { createServer } = require("http");
const { Server } = require("socket.io");
require("dotenv").config();

const app = express();
const server = createServer(app);

// Security middleware
app.use(helmet());
app.use(
    cors({
        origin: process.env.FRONTEND_URL || "http://localhost:3000",
        credentials: true,
    })
);

// Initialize Socket.IO with CORS
const io = new Server(server, {
    cors: {
        origin: process.env.FRONTEND_URL || "http://localhost:3000",
        methods: ["GET", "POST"],
        credentials: true,
    },
});

// Store active Dutch auctions
const activeAuctions = new Map();

// Rate limiting
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // limit each IP to 100 requests per windowMs
});
app.use(limiter);

// Body parsing middleware
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));

// MongoDB connection
const connectDB = async () => {
    try {
        const conn = await mongoose.connect(
            process.env.MONGODB_URI ||
                "mongodb://localhost:27017/orderprotocol",
            {
                useNewUrlParser: true,
                useUnifiedTopology: true,
            }
        );
        console.log(`MongoDB Connected: ${conn.connection.host}`);
    } catch (error) {
        console.error("Database connection error:", error);
        process.exit(1);
    }
};

// Connect to database
connectDB();

// Dutch Auction Logic
class DutchAuctionManager {
    static createAuction(orderId, startPrice, endPrice, duration = 5000) {
        const auction = {
            orderId,
            startPrice: parseFloat(startPrice),
            endPrice: parseFloat(endPrice),
            currentPrice: parseFloat(startPrice),
            startTime: Date.now(),
            duration,
            isActive: true,
            intervalId: null,
        };

        // Price decay function - slower at start, faster towards end
        const updatePrice = () => {
            const elapsed = Date.now() - auction.startTime;
            const progress = elapsed / auction.duration;

            if (progress >= 1) {
                // Auction ended
                auction.currentPrice = auction.endPrice;
                auction.isActive = false;
                clearInterval(auction.intervalId);
                activeAuctions.delete(orderId);

                io.emit("auctionEnded", {
                    orderId,
                    finalPrice: auction.endPrice,
                    reason: "timeout",
                });

                console.log(
                    `🏁 Dutch auction for order ${orderId} ended (timeout)`
                );
                return;
            }

            // Non-linear price decrease (quadratic curve for faster decrease towards end)
            const adjustedProgress = Math.pow(progress, 1.5);
            const priceRange = auction.startPrice - auction.endPrice;
            auction.currentPrice =
                auction.startPrice - priceRange * adjustedProgress;

            // Emit current price to all connected clients
            io.emit("priceUpdate", {
                orderId,
                currentPrice: auction.currentPrice,
                progress: progress * 100,
                timeRemaining: auction.duration - elapsed,
            });
        };

        // Update price every 50ms for smooth animation
        auction.intervalId = setInterval(updatePrice, 50);
        activeAuctions.set(orderId, auction);

        console.log(
            `🚀 Started Dutch auction for order ${orderId}: ${startPrice} → ${endPrice}`
        );

        // Emit auction started event
        io.emit("auctionStarted", {
            orderId,
            startPrice: auction.startPrice,
            endPrice: auction.endPrice,
            duration: auction.duration,
        });

        return auction;
    }

    static acceptAuction(orderId, acceptedPrice) {
        const auction = activeAuctions.get(orderId);
        if (!auction || !auction.isActive) {
            return { success: false, message: "Auction not active" };
        }

        // Stop the auction
        clearInterval(auction.intervalId);
        auction.isActive = false;
        auction.acceptedPrice = acceptedPrice;
        activeAuctions.delete(orderId);

        // Emit auction accepted event
        io.emit("auctionAccepted", {
            orderId,
            acceptedPrice,
            finalPrice: acceptedPrice,
            reason: "accepted",
        });

        console.log(
            `✅ Dutch auction for order ${orderId} accepted at price ${acceptedPrice}`
        );

        return { success: true, acceptedPrice };
    }

    static getActiveAuction(orderId) {
        return activeAuctions.get(orderId);
    }

    static getAllActiveAuctions() {
        return Array.from(activeAuctions.values());
    }
}

// Socket.IO connection handling
io.on("connection", (socket) => {
    console.log(`🔌 Client connected: ${socket.id}`);

    // Send current active auctions to newly connected client
    socket.emit("activeAuctions", DutchAuctionManager.getAllActiveAuctions());

    socket.on("disconnect", () => {
        console.log(`🔌 Client disconnected: ${socket.id}`);
    });
});

// Make DutchAuctionManager available to routes
app.set("auctionManager", DutchAuctionManager);
app.set("socketio", io);

// Import routes
const orderRoutes = require("./routes/orders");

// Use routes
app.use("/api/orders", orderRoutes);

// Health check endpoint
app.get("/health", (req, res) => {
    res.status(200).json({ status: "OK", timestamp: new Date().toISOString() });
});

// Error handling middleware
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

// 404 handler
app.use("*", (req, res) => {
    res.status(404).json({ error: "Route not found" });
});

const PORT = process.env.PORT || 5001;

server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`Environment: ${process.env.NODE_ENV || "development"}`);
    console.log(`🔌 Socket.IO server initialized`);
});

module.exports = app;
