const {
    createAppSessionMessage,
    createCloseAppSessionMessage,
    parseRPCResponse,
    RPCMethod,
} = require("@erc7824/nitrolite");

class YellowSessionManager {
    constructor(clearNodeConnection) {
        this.clearNode = clearNodeConnection;
        this.activeSessions = new Map();
        this.pendingRequests = new Map();
    }

    async createTripartiteSession(orderId, makerAddress, resolverAddress) {
        console.log(`🔄 Creating 3-entity Yellow session for order ${orderId}`);

        if (!this.clearNode.isAuthenticated) {
            throw new Error("ClearNode not authenticated");
        }

        try {
            // Create app session parameters according to nitrolite structure
            const sessionParams = {
                participants: [
                    this.clearNode.wallet.address, // Backend relayer
                    makerAddress, // User/Maker
                    resolverAddress, // Resolver bot
                ],
                // Simple allocation structure for hackathon MVP
                assets: ["usdc"], // Focus on USDC for demo
                initial_balances: {
                    [this.clearNode.wallet.address]: "0",
                    [makerAddress]: "1000000", // 1 USDC (6 decimals)
                    [resolverAddress]: "0",
                },
            };

            console.log(
                "📋 Session params:",
                JSON.stringify(sessionParams, null, 2)
            );

            // Create app session message using nitrolite SDK
            const sessionMessage = await createAppSessionMessage(
                this.clearNode.messageSigner.bind(this.clearNode),
                [sessionParams] // Wrap in array as expected by SDK
            );

            // Send the session creation request
            console.log(
                "📤 Sending session creation request to Yellow ClearNode"
            );

            return new Promise((resolve, reject) => {
                const requestId = Math.floor(Math.random() * 1000000);

                // Store the callback for this request
                this.pendingRequests.set(requestId, {
                    resolve,
                    reject,
                    orderId,
                    type: "create_session",
                });

                // Set up one-time message handler for this request
                const handleResponse = (event) => {
                    try {
                        const message = JSON.parse(event.data);
                        console.log("📨 Session creation response:", message);

                        // Check if this is our session creation response
                        if (
                            message.res &&
                            message.res[1] === "create_app_session"
                        ) {
                            const responseData = message.res[2];

                            if (responseData && responseData.app_session_id) {
                                const sessionId = responseData.app_session_id;
                                this.activeSessions.set(orderId, {
                                    sessionId,
                                    participants: sessionParams.participants,
                                    createdAt: new Date(),
                                    status: "active",
                                });

                                console.log(
                                    `✅ Yellow session created: ${sessionId}`
                                );
                                resolve(sessionId);
                            } else if (responseData && responseData.error) {
                                console.error(
                                    "❌ Session creation failed:",
                                    responseData.error
                                );
                                reject(
                                    new Error(
                                        `Session creation failed: ${responseData.error}`
                                    )
                                );
                            } else {
                                console.log(
                                    "⏳ Session creation in progress..."
                                );
                                // Could be intermediate response, continue waiting
                            }
                        }
                    } catch (error) {
                        console.error("Session response parsing error:", error);
                        reject(
                            new Error(
                                `Session response parsing failed: ${error.message}`
                            )
                        );
                    }
                };

                // Add temporary listener
                this.clearNode.ws.addEventListener("message", handleResponse);

                // Send the message
                this.clearNode.ws.send(sessionMessage);

                // Cleanup timeout
                setTimeout(() => {
                    this.clearNode.ws.removeEventListener(
                        "message",
                        handleResponse
                    );
                    if (this.pendingRequests.has(requestId)) {
                        this.pendingRequests.delete(requestId);
                        reject(new Error("Session creation timeout"));
                    }
                }, 15000); // 15 second timeout for hackathon
            });
        } catch (error) {
            console.error("Session creation failed:", error);
            throw new Error(
                `Failed to create Yellow session: ${error.message}`
            );
        }
    }

    async instantSettlement(orderId, finalAllocations) {
        const sessionData = this.activeSessions.get(orderId);
        if (!sessionData) {
            throw new Error("No active session for order");
        }

        console.log(`⚡ Executing instant settlement for order ${orderId}`);
        console.log(
            "💰 Final allocations:",
            JSON.stringify(finalAllocations, null, 2)
        );

        try {
            // Create close session parameters
            const closeParams = {
                app_session_id: sessionData.sessionId,
                final_balances: finalAllocations,
            };

            // Create close message using nitrolite SDK
            const closeMessage = await createCloseAppSessionMessage(
                this.clearNode.messageSigner.bind(this.clearNode),
                [closeParams]
            );

            return new Promise((resolve, reject) => {
                const handleResponse = (event) => {
                    try {
                        const message = JSON.parse(event.data);
                        console.log("📨 Settlement response:", message);

                        if (
                            message.res &&
                            message.res[1] === "close_app_session"
                        ) {
                            const responseData = message.res[2];

                            if (responseData && responseData.success) {
                                // Mark session as closed
                                sessionData.status = "closed";
                                sessionData.closedAt = new Date();

                                console.log(
                                    "✅ Instant settlement completed via Yellow Network"
                                );
                                resolve(responseData);
                            } else if (responseData && responseData.error) {
                                console.error(
                                    "❌ Settlement failed:",
                                    responseData.error
                                );
                                reject(
                                    new Error(
                                        `Settlement failed: ${responseData.error}`
                                    )
                                );
                            }
                        }
                    } catch (error) {
                        console.error(
                            "Settlement response parsing error:",
                            error
                        );
                        reject(
                            new Error(
                                `Settlement response parsing failed: ${error.message}`
                            )
                        );
                    }
                };

                // Add temporary listener
                this.clearNode.ws.addEventListener("message", handleResponse);

                // Send the close message
                this.clearNode.ws.send(closeMessage);

                // Cleanup timeout
                setTimeout(() => {
                    this.clearNode.ws.removeEventListener(
                        "message",
                        handleResponse
                    );
                    reject(new Error("Settlement timeout"));
                }, 10000); // 10 second timeout for hackathon
            });
        } catch (error) {
            console.error("Instant settlement failed:", error);
            throw new Error(`Failed to execute settlement: ${error.message}`);
        }
    }

    // Simple session status check
    getSessionStatus(orderId) {
        const sessionData = this.activeSessions.get(orderId);
        if (!sessionData) {
            return { status: "not_found" };
        }

        return {
            status: sessionData.status,
            sessionId: sessionData.sessionId,
            participants: sessionData.participants,
            createdAt: sessionData.createdAt,
            closedAt: sessionData.closedAt,
        };
    }

    getActiveSessionCount() {
        return Array.from(this.activeSessions.values()).filter(
            (session) => session.status === "active"
        ).length;
    }

    getSessionId(orderId) {
        const sessionData = this.activeSessions.get(orderId);
        return sessionData ? sessionData.sessionId : null;
    }

    // Cleanup helper for testing
    clearSession(orderId) {
        return this.activeSessions.delete(orderId);
    }

    // Get all sessions for debugging
    getAllSessions() {
        const sessions = {};
        for (const [orderId, sessionData] of this.activeSessions) {
            sessions[orderId] = sessionData;
        }
        return sessions;
    }
}

module.exports = YellowSessionManager;
