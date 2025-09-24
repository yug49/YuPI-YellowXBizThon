// Production Monitoring and Error Handling System
// Phase 3.4: Production Readiness

const winston = require("winston");
const axios = require("axios");
const EventEmitter = require("events");

class ProductionMonitor extends EventEmitter {
    constructor(config = {}) {
        super();
        this.config = {
            logLevel: process.env.LOG_LEVEL || "info",
            slackWebhook: process.env.SLACK_WEBHOOK_URL,
            monitoringEndpoint: process.env.MONITORING_ENDPOINT,
            alertThresholds: {
                errorRate: 0.05, // 5% error rate threshold
                responseTime: 10000, // 10s response time threshold
                yellowNetworkDowntime: 30000, // 30s downtime threshold
                lowBalance: 1000, // Minimum balance in INR
            },
            ...config,
        };

        this.metrics = {
            totalRequests: 0,
            errorCount: 0,
            responseTimeSum: 0,
            yellowNetworkStatus: "unknown",
            lastYellowNetworkPing: null,
            balanceAlerts: new Set(),
        };

        this.setupLogger();
        this.startHealthChecks();
    }

    setupLogger() {
        this.logger = winston.createLogger({
            level: this.config.logLevel,
            format: winston.format.combine(
                winston.format.timestamp(),
                winston.format.errors({ stack: true }),
                winston.format.json()
            ),
            defaultMeta: { service: "yellow-network-integration" },
            transports: [
                new winston.transports.File({
                    filename: "logs/error.log",
                    level: "error",
                    maxsize: 10485760, // 10MB
                    maxFiles: 5,
                }),
                new winston.transports.File({
                    filename: "logs/combined.log",
                    maxsize: 10485760,
                    maxFiles: 5,
                }),
                new winston.transports.Console({
                    format: winston.format.combine(
                        winston.format.colorize(),
                        winston.format.simple()
                    ),
                }),
            ],
        });
    }

    // Health check methods
    async checkBackendHealth() {
        try {
            const start = Date.now();
            const response = await axios.get(`${process.env.API_URL}/health`, {
                timeout: 5000,
            });
            const responseTime = Date.now() - start;

            this.recordMetric("backend_health", {
                status: "healthy",
                responseTime,
                timestamp: new Date().toISOString(),
            });

            if (responseTime > this.config.alertThresholds.responseTime) {
                this.sendAlert("high_response_time", {
                    service: "backend",
                    responseTime,
                    threshold: this.config.alertThresholds.responseTime,
                });
            }

            return { healthy: true, responseTime };
        } catch (error) {
            this.recordMetric("backend_health", {
                status: "unhealthy",
                error: error.message,
                timestamp: new Date().toISOString(),
            });

            this.sendAlert("service_down", {
                service: "backend",
                error: error.message,
            });

            return { healthy: false, error: error.message };
        }
    }

    async checkYellowNetworkHealth() {
        try {
            const start = Date.now();
            // Simulate Yellow Network ping
            const mockResponse = await new Promise((resolve, reject) => {
                setTimeout(() => {
                    if (Math.random() > 0.95) {
                        // 5% failure rate for demo
                        reject(new Error("Yellow Network timeout"));
                    } else {
                        resolve({
                            status: "connected",
                            latency: Date.now() - start,
                        });
                    }
                }, Math.random() * 1000 + 500); // 500-1500ms response time
            });

            this.metrics.yellowNetworkStatus = "connected";
            this.metrics.lastYellowNetworkPing = Date.now();

            this.recordMetric("yellow_network_health", {
                status: "connected",
                latency: mockResponse.latency,
                timestamp: new Date().toISOString(),
            });

            return { healthy: true, latency: mockResponse.latency };
        } catch (error) {
            this.metrics.yellowNetworkStatus = "disconnected";

            const downtime =
                Date.now() - (this.metrics.lastYellowNetworkPing || Date.now());
            if (downtime > this.config.alertThresholds.yellowNetworkDowntime) {
                this.sendAlert("yellow_network_down", {
                    downtime,
                    error: error.message,
                });
            }

            this.recordMetric("yellow_network_health", {
                status: "disconnected",
                error: error.message,
                downtime,
                timestamp: new Date().toISOString(),
            });

            return { healthy: false, error: error.message, downtime };
        }
    }

    async checkRazorpayHealth() {
        try {
            // Mock RazorpayX health check
            const mockResponse = await new Promise((resolve) => {
                setTimeout(() => {
                    resolve({
                        status: "operational",
                        balance: Math.floor(Math.random() * 50000) + 10000, // 10k-60k INR
                    });
                }, 200);
            });

            // Check balance alert
            if (mockResponse.balance < this.config.alertThresholds.lowBalance) {
                const alertKey = `low_balance_${Math.floor(
                    Date.now() / 3600000
                )}`; // Once per hour
                if (!this.metrics.balanceAlerts.has(alertKey)) {
                    this.sendAlert("low_balance", {
                        currentBalance: mockResponse.balance,
                        threshold: this.config.alertThresholds.lowBalance,
                    });
                    this.metrics.balanceAlerts.add(alertKey);
                }
            }

            this.recordMetric("razorpay_health", {
                status: "operational",
                balance: mockResponse.balance,
                timestamp: new Date().toISOString(),
            });

            return { healthy: true, balance: mockResponse.balance };
        } catch (error) {
            this.recordMetric("razorpay_health", {
                status: "error",
                error: error.message,
                timestamp: new Date().toISOString(),
            });

            return { healthy: false, error: error.message };
        }
    }

    // Error tracking and alerting
    recordError(context, error, severity = "error") {
        this.metrics.errorCount++;
        this.metrics.totalRequests++;

        const errorData = {
            context,
            message: error.message,
            stack: error.stack,
            severity,
            timestamp: new Date().toISOString(),
            requestId: context.requestId || "unknown",
        };

        this.logger.error("Error recorded", errorData);

        // Check error rate
        const errorRate = this.metrics.errorCount / this.metrics.totalRequests;
        if (
            errorRate > this.config.alertThresholds.errorRate &&
            this.metrics.totalRequests > 10
        ) {
            this.sendAlert("high_error_rate", {
                errorRate: (errorRate * 100).toFixed(2),
                threshold: (
                    this.config.alertThresholds.errorRate * 100
                ).toFixed(2),
                totalRequests: this.metrics.totalRequests,
                errorCount: this.metrics.errorCount,
            });
        }

        // Send critical error alerts immediately
        if (severity === "critical") {
            this.sendAlert("critical_error", errorData);
        }

        this.emit("error_recorded", errorData);
    }

    recordMetric(metricName, data) {
        this.logger.info(`Metric: ${metricName}`, data);

        // Send to monitoring endpoint if configured
        if (this.config.monitoringEndpoint) {
            this.sendToMonitoring(metricName, data).catch((error) => {
                this.logger.warn(
                    "Failed to send metric to monitoring endpoint",
                    {
                        error: error.message,
                        metric: metricName,
                    }
                );
            });
        }

        this.emit("metric_recorded", { metricName, data });
    }

    async sendToMonitoring(metricName, data) {
        try {
            await axios.post(
                this.config.monitoringEndpoint,
                {
                    metric: metricName,
                    data,
                    service: "yellow-network-integration",
                    timestamp: new Date().toISOString(),
                },
                {
                    timeout: 5000,
                    headers: {
                        "Content-Type": "application/json",
                        "User-Agent": "YellowNetwork-Monitor/1.0",
                    },
                }
            );
        } catch (error) {
            throw new Error(`Monitoring endpoint failed: ${error.message}`);
        }
    }

    async sendAlert(alertType, data) {
        const alert = {
            type: alertType,
            severity: this.getAlertSeverity(alertType),
            data,
            timestamp: new Date().toISOString(),
            service: "yellow-network-integration",
        };

        this.logger.warn(`Alert: ${alertType}`, alert);

        // Send to Slack if configured
        if (this.config.slackWebhook) {
            try {
                await this.sendSlackAlert(alert);
            } catch (error) {
                this.logger.error("Failed to send Slack alert", {
                    error: error.message,
                });
            }
        }

        this.emit("alert_sent", alert);
    }

    async sendSlackAlert(alert) {
        const color =
            {
                critical: "#FF0000",
                warning: "#FFA500",
                info: "#0000FF",
            }[alert.severity] || "#808080";

        const message = {
            attachments: [
                {
                    color,
                    title: `🚨 Yellow Network Alert: ${alert.type}`,
                    text: this.formatAlertMessage(alert),
                    footer: "Yellow Network Monitor",
                    ts: Math.floor(Date.now() / 1000),
                },
            ],
        };

        await axios.post(this.config.slackWebhook, message, {
            timeout: 5000,
            headers: { "Content-Type": "application/json" },
        });
    }

    formatAlertMessage(alert) {
        switch (alert.type) {
            case "high_error_rate":
                return `Error rate is ${alert.data.errorRate}% (threshold: ${alert.data.threshold}%)\nTotal requests: ${alert.data.totalRequests}, Errors: ${alert.data.errorCount}`;

            case "high_response_time":
                return `${alert.data.service} response time is ${alert.data.responseTime}ms (threshold: ${alert.data.threshold}ms)`;

            case "yellow_network_down":
                return `Yellow Network disconnected for ${Math.floor(
                    alert.data.downtime / 1000
                )}s\nError: ${alert.data.error}`;

            case "low_balance":
                return `RazorpayX balance is ₹${alert.data.currentBalance} (threshold: ₹${alert.data.threshold})`;

            case "service_down":
                return `${alert.data.service} service is down\nError: ${alert.data.error}`;

            case "critical_error":
                return `Critical error in ${alert.data.context}\nMessage: ${alert.data.message}`;

            default:
                return JSON.stringify(alert.data, null, 2);
        }
    }

    getAlertSeverity(alertType) {
        const severityMap = {
            critical_error: "critical",
            service_down: "critical",
            yellow_network_down: "warning",
            high_error_rate: "warning",
            high_response_time: "warning",
            low_balance: "warning",
        };
        return severityMap[alertType] || "info";
    }

    startHealthChecks() {
        // Run health checks every 30 seconds
        setInterval(async () => {
            try {
                const [backend, yellowNetwork, razorpay] =
                    await Promise.allSettled([
                        this.checkBackendHealth(),
                        this.checkYellowNetworkHealth(),
                        this.checkRazorpayHealth(),
                    ]);

                const healthStatus = {
                    backend:
                        backend.status === "fulfilled"
                            ? backend.value
                            : { healthy: false, error: backend.reason.message },
                    yellowNetwork:
                        yellowNetwork.status === "fulfilled"
                            ? yellowNetwork.value
                            : {
                                  healthy: false,
                                  error: yellowNetwork.reason.message,
                              },
                    razorpay:
                        razorpay.status === "fulfilled"
                            ? razorpay.value
                            : {
                                  healthy: false,
                                  error: razorpay.reason.message,
                              },
                    timestamp: new Date().toISOString(),
                };

                this.recordMetric("health_check", healthStatus);
            } catch (error) {
                this.logger.error("Health check failed", {
                    error: error.message,
                });
            }
        }, 30000);

        // Clean up old balance alerts every hour
        setInterval(() => {
            this.metrics.balanceAlerts.clear();
        }, 3600000);
    }

    // Get current system status
    getSystemStatus() {
        return {
            status: this.getOverallStatus(),
            metrics: {
                ...this.metrics,
                errorRate:
                    this.metrics.totalRequests > 0
                        ? (this.metrics.errorCount /
                              this.metrics.totalRequests) *
                          100
                        : 0,
                averageResponseTime:
                    this.metrics.totalRequests > 0
                        ? this.metrics.responseTimeSum /
                          this.metrics.totalRequests
                        : 0,
            },
            uptime: process.uptime(),
            memory: process.memoryUsage(),
            version: require("../package.json").version,
            timestamp: new Date().toISOString(),
        };
    }

    getOverallStatus() {
        const errorRate =
            this.metrics.totalRequests > 0
                ? this.metrics.errorCount / this.metrics.totalRequests
                : 0;

        if (errorRate > this.config.alertThresholds.errorRate) {
            return "degraded";
        }

        if (this.metrics.yellowNetworkStatus === "disconnected") {
            return "degraded";
        }

        return "healthy";
    }

    // Graceful shutdown
    async shutdown() {
        this.logger.info("Production monitor shutting down...");

        // Send final metrics
        const finalStatus = this.getSystemStatus();
        this.recordMetric("shutdown", finalStatus);

        // Wait for logs to flush
        await new Promise((resolve) => setTimeout(resolve, 1000));

        this.logger.info("Production monitor shutdown complete");
    }
}

// Express middleware for request monitoring
function createMonitoringMiddleware(monitor) {
    return (req, res, next) => {
        const start = Date.now();
        const requestId =
            req.headers["x-request-id"] ||
            `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

        req.requestId = requestId;
        req.monitor = monitor;

        res.on("finish", () => {
            const duration = Date.now() - start;
            monitor.metrics.totalRequests++;
            monitor.metrics.responseTimeSum += duration;

            const logData = {
                requestId,
                method: req.method,
                url: req.url,
                statusCode: res.statusCode,
                duration,
                userAgent: req.headers["user-agent"],
                ip: req.ip,
            };

            if (res.statusCode >= 400) {
                monitor.metrics.errorCount++;
                monitor.logger.warn("Request error", logData);
            } else {
                monitor.logger.info("Request completed", logData);
            }

            monitor.recordMetric("request_completed", logData);
        });

        next();
    };
}

module.exports = {
    ProductionMonitor,
    createMonitoringMiddleware,
};

// Example usage
if (require.main === module) {
    const monitor = new ProductionMonitor();

    // Handle process signals for graceful shutdown
    process.on("SIGTERM", async () => {
        console.log("Received SIGTERM, shutting down gracefully...");
        await monitor.shutdown();
        process.exit(0);
    });

    process.on("SIGINT", async () => {
        console.log("Received SIGINT, shutting down gracefully...");
        await monitor.shutdown();
        process.exit(0);
    });

    console.log("🔍 Production Monitor started");
}
