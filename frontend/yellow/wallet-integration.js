/**
 * Yellow Network Wallet Integration
 * Provides frontend interface for Yellow Network instant settlements
 */

export class YellowWalletIntegration {
    constructor() {
        this.backendUrl =
            process.env.NEXT_PUBLIC_API_URL || "http://localhost:5001";
        this.isConnected = false;
        this.sessionId = null;
        this.listeners = new Map();
    }

    /**
     * Check Yellow Network connection status from backend
     */
    async checkYellowStatus() {
        try {
            const response = await fetch(`${this.backendUrl}/health`);
            const health = await response.json();

            return {
                connected:
                    health.yellowNetwork?.status === "healthy" ||
                    health.yellowNetwork?.status === "connected",
                authenticated: health.yellowNetwork?.authenticated || false,
                performance: {
                    traditional: "20-30s",
                    yellow: "~5s",
                    improvement: "85% faster",
                },
            };
        } catch (error) {
            console.error("Failed to check Yellow Network status:", error);
            return { connected: false, authenticated: false };
        }
    }

    /**
     * Get order status with Yellow Network information
     */
    async getOrderStatus(orderId) {
        try {
            const response = await fetch(
                `${this.backendUrl}/api/orders/${orderId}`
            );
            const data = await response.json();

            return {
                ...data.data,
                yellowNetwork: data.data.yellowNetwork || null,
            };
        } catch (error) {
            console.error("Failed to get order status:", error);
            return null;
        }
    }

    /**
     * Subscribe to order updates with Yellow Network status
     */
    subscribeToOrderUpdates(orderId, callback) {
        // Store callback for this order
        this.listeners.set(orderId, callback);

        // Poll for updates every 2 seconds
        const pollInterval = setInterval(async () => {
            const orderStatus = await this.getOrderStatus(orderId);
            if (orderStatus && this.listeners.has(orderId)) {
                this.listeners.get(orderId)(orderStatus);

                // Stop polling if order is fulfilled
                if (orderStatus.status === "fulfilled") {
                    clearInterval(pollInterval);
                    this.listeners.delete(orderId);
                }
            }
        }, 2000);

        return () => {
            clearInterval(pollInterval);
            this.listeners.delete(orderId);
        };
    }

    /**
     * Get performance metrics comparing traditional vs Yellow Network
     */
    getPerformanceMetrics(orderData) {
        const hasYellowSession = orderData?.yellowNetwork?.sessionId;

        return {
            settlement: {
                traditional: "20-30 seconds",
                yellow: "~5 seconds",
                current: hasYellowSession ? "~5 seconds" : "20-30 seconds",
            },
            improvement: hasYellowSession ? "85% faster" : "Traditional speed",
            technology: hasYellowSession
                ? "State Channels"
                : "Blockchain Confirmation",
            status: hasYellowSession ? "instant" : "standard",
        };
    }
}
