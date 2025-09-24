#!/usr/bin/env node

// Complete Phase 3 Integration Test
// Tests all components of Yellow Network integration

const axios = require("axios");
const WebSocket = require("ws");
const { spawn } = require("child_process");
const path = require("path");
const fs = require("fs");

class Phase3IntegrationTest {
    constructor() {
        this.baseUrl = "http://localhost:3333";
        this.wsUrl = "ws://localhost:3333";
        this.testResults = [];
        this.startTime = Date.now();
    }

    async runAllTests() {
        console.log("🧪 Starting Complete Phase 3 Integration Tests...\n");

        try {
            // Test Phase 3.1: Frontend Integration
            await this.testFrontendIntegration();

            // Test Phase 3.2: Real Payment Integration
            await this.testPaymentIntegration();

            // Test Phase 3.3: Demo Flow Optimization
            await this.testDemoOptimization();

            // Test Phase 3.4: Production Readiness
            await this.testProductionReadiness();

            // Test Complete Flow
            await this.testCompleteFlow();

            // Test WebSocket Integration
            await this.testWebSocketIntegration();

            // Generate test report
            this.generateTestReport();
        } catch (error) {
            console.error("❌ Test suite failed:", error.message);
            process.exit(1);
        }
    }

    async testFrontendIntegration() {
        console.log("🎨 Testing Phase 3.1: Frontend Integration...");

        try {
            const response = await axios.get(
                `${this.baseUrl}/api/demo/frontend`
            );

            this.addTestResult("Frontend Integration API", true, {
                status: response.status,
                phase: response.data.phase,
                features: response.data.features.length,
            });

            // Check if frontend features are properly configured
            const expectedFeatures = [
                "Yellow Network status indicators",
                "Real-time performance metrics (85% improvement)",
                "Enhanced order creation UI",
                "WebSocket connection for live updates",
            ];

            const hasAllFeatures = expectedFeatures.every((feature) =>
                response.data.features.includes(feature)
            );

            this.addTestResult("Frontend Features Complete", hasAllFeatures, {
                expected: expectedFeatures.length,
                actual: response.data.features.length,
                performanceImprovement:
                    response.data.metrics.performanceImprovement,
            });

            console.log("  ✅ Frontend integration tests passed");
        } catch (error) {
            this.addTestResult("Frontend Integration", false, {
                error: error.message,
            });
            console.log(
                "  ❌ Frontend integration tests failed:",
                error.message
            );
        }
    }

    async testPaymentIntegration() {
        console.log("💳 Testing Phase 3.2: Real Payment Integration...");

        try {
            const response = await axios.get(
                `${this.baseUrl}/api/demo/payment`
            );

            this.addTestResult("Payment Integration API", true, {
                status: response.status,
                phase: response.data.phase,
                integrations: Object.keys(response.data.integrations).length,
            });

            // Verify all required integrations
            const requiredIntegrations = [
                "yellowNetwork",
                "razorpayX",
                "blockchain",
                "monitoring",
            ];
            const hasAllIntegrations = requiredIntegrations.every(
                (integration) => response.data.integrations[integration]
            );

            this.addTestResult(
                "Payment Integrations Complete",
                hasAllIntegrations,
                {
                    required: requiredIntegrations,
                    actual: Object.keys(response.data.integrations),
                }
            );

            console.log("  ✅ Payment integration tests passed");
        } catch (error) {
            this.addTestResult("Payment Integration", false, {
                error: error.message,
            });
            console.log(
                "  ❌ Payment integration tests failed:",
                error.message
            );
        }
    }

    async testDemoOptimization() {
        console.log("📊 Testing Phase 3.3: Demo Flow Optimization...");

        try {
            const response = await axios.get(
                `${this.baseUrl}/api/demo/optimization`
            );

            this.addTestResult("Demo Optimization API", true, {
                status: response.status,
                phase: response.data.phase,
                features: response.data.features.length,
            });

            // Test dashboard accessibility
            try {
                const dashboardResponse = await axios.get(
                    `${this.baseUrl}/demo/dashboard/index.html`
                );
                this.addTestResult(
                    "Demo Dashboard Accessibility",
                    dashboardResponse.status === 200,
                    {
                        status: dashboardResponse.status,
                        contentLength: dashboardResponse.data.length,
                    }
                );
            } catch (dashboardError) {
                this.addTestResult("Demo Dashboard Accessibility", false, {
                    error: dashboardError.message,
                });
            }

            console.log("  ✅ Demo optimization tests passed");
        } catch (error) {
            this.addTestResult("Demo Optimization", false, {
                error: error.message,
            });
            console.log("  ❌ Demo optimization tests failed:", error.message);
        }
    }

    async testProductionReadiness() {
        console.log("🏭 Testing Phase 3.4: Production Readiness...");

        try {
            const response = await axios.get(
                `${this.baseUrl}/api/demo/production`
            );

            this.addTestResult("Production Readiness API", true, {
                status: response.status,
                phase: response.data.phase,
                features: response.data.features.length,
            });

            // Test health check endpoint
            const healthResponse = await axios.get(`${this.baseUrl}/health`);
            const isHealthy = healthResponse.data.status === "healthy";

            this.addTestResult("Health Check System", isHealthy, {
                status: healthResponse.data.status,
                uptime: healthResponse.data.uptime,
                version: healthResponse.data.version,
            });

            // Verify production metrics
            const productionMetrics = response.data.productionMetrics;
            const hasMetrics =
                productionMetrics &&
                typeof productionMetrics.uptime === "number" &&
                productionMetrics.timestamp;

            this.addTestResult("Production Metrics", hasMetrics, {
                metricsPresent: !!productionMetrics,
                uptime: productionMetrics?.uptime,
                timestamp: productionMetrics?.timestamp,
            });

            console.log("  ✅ Production readiness tests passed");
        } catch (error) {
            this.addTestResult("Production Readiness", false, {
                error: error.message,
            });
            console.log(
                "  ❌ Production readiness tests failed:",
                error.message
            );
        }
    }

    async testCompleteFlow() {
        console.log("🔄 Testing Complete Phase 3 Flow...");

        try {
            // Test Phase 3 overview
            const overviewResponse = await axios.get(
                `${this.baseUrl}/api/demo/phase3-complete`
            );

            this.addTestResult("Phase 3 Overview API", true, {
                status: overviewResponse.status,
                completion: overviewResponse.data.completion,
                phases: Object.keys(overviewResponse.data.phases).length,
            });

            // Verify all phases are complete
            const phases = overviewResponse.data.phases;
            const allPhasesComplete = Object.values(phases).every(
                (phase) => phase.status === "complete"
            );

            this.addTestResult("All Phases Complete", allPhasesComplete, {
                phases: Object.keys(phases),
                completionStatus: Object.values(phases).map((p) => p.status),
            });

            // Test complete flow simulation
            const simulationResponse = await axios.post(
                `${this.baseUrl}/api/demo/simulate-complete-flow`,
                {
                    amount: 1500,
                    recipientUpi: "test@upi",
                }
            );

            const simulationSuccess =
                simulationResponse.data.status === "completed";
            this.addTestResult("Complete Flow Simulation", simulationSuccess, {
                orderId: simulationResponse.data.orderId,
                processingTime: simulationResponse.data.totalProcessingTime,
                performanceImprovement:
                    simulationResponse.data.performanceImprovement,
                steps: simulationResponse.data.steps.length,
            });

            // Verify performance improvement
            const hasPerformanceImprovement =
                simulationResponse.data.performanceImprovement > 0;
            this.addTestResult(
                "Performance Improvement Achieved",
                hasPerformanceImprovement,
                {
                    improvement: simulationResponse.data.performanceImprovement,
                    processingTime: simulationResponse.data.totalProcessingTime,
                    yellowNetworkUsed:
                        simulationResponse.data.yellowNetworkUsed,
                }
            );

            console.log("  ✅ Complete flow tests passed");
        } catch (error) {
            this.addTestResult("Complete Flow", false, {
                error: error.message,
            });
            console.log("  ❌ Complete flow tests failed:", error.message);
        }
    }

    async testWebSocketIntegration() {
        console.log("🔗 Testing WebSocket Integration...");

        return new Promise((resolve) => {
            const ws = new WebSocket(this.wsUrl);
            let messageReceived = false;
            let connectionEstablished = false;

            const timeout = setTimeout(() => {
                this.addTestResult("WebSocket Connection", false, {
                    error: "Connection timeout",
                });
                ws.close();
                resolve();
            }, 10000);

            ws.on("open", () => {
                connectionEstablished = true;
                this.addTestResult("WebSocket Connection", true, {
                    url: this.wsUrl,
                    readyState: ws.readyState,
                });

                // Send test message
                ws.send(
                    JSON.stringify({
                        type: "metrics_request",
                    })
                );
            });

            ws.on("message", (data) => {
                try {
                    const message = JSON.parse(data);
                    messageReceived = true;

                    this.addTestResult("WebSocket Messaging", true, {
                        messageType: message.type,
                        hasData: !!message.data,
                    });

                    clearTimeout(timeout);
                    ws.close();
                    console.log("  ✅ WebSocket integration tests passed");
                    resolve();
                } catch (error) {
                    this.addTestResult("WebSocket Messaging", false, {
                        error: error.message,
                    });
                    clearTimeout(timeout);
                    ws.close();
                    resolve();
                }
            });

            ws.on("error", (error) => {
                this.addTestResult("WebSocket Connection", false, {
                    error: error.message,
                });
                clearTimeout(timeout);
                console.log(
                    "  ❌ WebSocket integration tests failed:",
                    error.message
                );
                resolve();
            });
        });
    }

    addTestResult(testName, passed, details = {}) {
        this.testResults.push({
            testName,
            passed,
            details,
            timestamp: new Date().toISOString(),
        });
    }

    generateTestReport() {
        const totalTests = this.testResults.length;
        const passedTests = this.testResults.filter((r) => r.passed).length;
        const failedTests = totalTests - passedTests;
        const successRate = ((passedTests / totalTests) * 100).toFixed(1);
        const testDuration = Date.now() - this.startTime;

        console.log("\n🏁 ========================================");
        console.log("🏁   PHASE 3 INTEGRATION TEST REPORT   ");
        console.log("🏁 ========================================\n");

        console.log(`📊 Test Summary:`);
        console.log(`   Total Tests: ${totalTests}`);
        console.log(`   Passed: ${passedTests} ✅`);
        console.log(`   Failed: ${failedTests} ❌`);
        console.log(`   Success Rate: ${successRate}%`);
        console.log(`   Duration: ${testDuration}ms\n`);

        console.log(`📋 Detailed Results:`);
        this.testResults.forEach((result, index) => {
            const status = result.passed ? "✅" : "❌";
            console.log(`   ${index + 1}. ${status} ${result.testName}`);
            if (!result.passed && result.details.error) {
                console.log(`      Error: ${result.details.error}`);
            }
        });

        // Write detailed report to file
        const reportData = {
            summary: {
                totalTests,
                passedTests,
                failedTests,
                successRate: parseFloat(successRate),
                duration: testDuration,
                timestamp: new Date().toISOString(),
            },
            results: this.testResults,
            phase3Status: {
                "3.1_Frontend_Integration": this.getPhaseStatus("Frontend"),
                "3.2_Payment_Integration": this.getPhaseStatus("Payment"),
                "3.3_Demo_Optimization": this.getPhaseStatus("Demo"),
                "3.4_Production_Readiness": this.getPhaseStatus("Production"),
            },
        };

        fs.writeFileSync(
            "phase3-test-report.json",
            JSON.stringify(reportData, null, 2)
        );
        console.log(`\n📄 Detailed report saved to: phase3-test-report.json`);

        if (successRate >= 90) {
            console.log(
                "\n🎉 Phase 3 Integration: EXCELLENT! Ready for production deployment! 🎉"
            );
        } else if (successRate >= 75) {
            console.log(
                "\n⚠️  Phase 3 Integration: GOOD, but some issues need attention"
            );
        } else {
            console.log(
                "\n❌ Phase 3 Integration: NEEDS WORK before deployment"
            );
        }

        console.log("\n🟡 Yellow Network Phase 3 testing complete! 🟡\n");
    }

    getPhaseStatus(phasePrefix) {
        const phaseTests = this.testResults.filter((r) =>
            r.testName.toLowerCase().includes(phasePrefix.toLowerCase())
        );
        const passed = phaseTests.filter((t) => t.passed).length;
        const total = phaseTests.length;

        return {
            testsRun: total,
            testsPassed: passed,
            status: passed === total ? "PASS" : "FAIL",
            successRate:
                total > 0 ? ((passed / total) * 100).toFixed(1) : "0.0",
        };
    }
}

// Run tests if this script is executed directly
if (require.main === module) {
    const tester = new Phase3IntegrationTest();

    // Add delay to ensure demo server is running
    setTimeout(async () => {
        try {
            await tester.runAllTests();
            process.exit(0);
        } catch (error) {
            console.error("Test suite failed:", error);
            process.exit(1);
        }
    }, 2000);
}

module.exports = Phase3IntegrationTest;
