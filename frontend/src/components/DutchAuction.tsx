import React, { useState, useEffect, useRef } from "react";
import { io, Socket } from "socket.io-client";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { Progress } from "./ui/progress";
import { Badge } from "./ui/badge";
import { Line } from "react-chartjs-2";
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    Title,
    Tooltip,
    Legend,
} from "chart.js";

// Register Chart.js components
ChartJS.register(
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    Title,
    Tooltip,
    Legend
);

interface DutchAuctionProps {
    orderId: string;
    startPrice: number;
    endPrice: number;
    onAuctionComplete?: (acceptedPrice: number) => void;
}

interface AuctionData {
    orderId: string;
    currentPrice: number;
    progress: number;
    timeRemaining: number;
}

interface PriceDataPoint {
    time: number;
    price: number;
}

interface FulfillmentData {
    transactionId: string;
    payoutId: string;
    status: string;
    utr?: string;
    amount: number;
    timestamp: string;
}

const DutchAuction: React.FC<DutchAuctionProps> = ({
    orderId,
    startPrice,
    endPrice,
    onAuctionComplete,
}) => {
    const [isActive, setIsActive] = useState(false);
    const [currentPrice, setCurrentPrice] = useState(startPrice);
    const [auctionProgress, setAuctionProgress] = useState(0);
    const [timeRemaining, setTimeRemaining] = useState(5000);
    const [isConnected, setIsConnected] = useState(false);
    const [priceHistory, setPriceHistory] = useState<PriceDataPoint[]>([]);
    const [hasStarted, setHasStarted] = useState(false);
    const [isAccepted, setIsAccepted] = useState(false);
    const [acceptedPrice, setAcceptedPrice] = useState<number | null>(null);
    const [isFulfilled, setIsFulfilled] = useState(false);
    const [fulfillmentData, setFulfillmentData] = useState<FulfillmentData | null>(null);
    const [acceptedBy, setAcceptedBy] = useState<string | null>(null);

    const socketRef = useRef<Socket | null>(null);
    const startTimeRef = useRef<number>(0);

    useEffect(() => {
        // Initialize Socket.IO connection
        const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:5001";
        socketRef.current = io(backendUrl, {
            withCredentials: true,
        });

        const socket = socketRef.current;

        socket.on("connect", () => {
            console.log("🔌 Connected to auction server");
            setIsConnected(true);
        });

        socket.on("disconnect", () => {
            console.log("🔌 Disconnected from auction server");
            setIsConnected(false);
        });

        socket.on("auctionStarted", (data) => {
            if (data.orderId === orderId) {
                console.log("🚀 Auction started for order:", orderId);
                setIsActive(true);
                setHasStarted(true);
                setCurrentPrice(data.startPrice);
                setAuctionProgress(0);
                setTimeRemaining(data.duration);
                startTimeRef.current = Date.now();
                setPriceHistory([{ time: 0, price: data.startPrice }]);
            }
        });

        socket.on("priceUpdate", (data: AuctionData) => {
            if (data.orderId === orderId) {
                setCurrentPrice(data.currentPrice);
                setAuctionProgress(data.progress);
                setTimeRemaining(data.timeRemaining);
                
                // Update price history for chart
                const elapsed = Date.now() - startTimeRef.current;
                setPriceHistory(prev => [...prev, { time: elapsed, price: data.currentPrice }]);
            }
        });

        socket.on("auctionAccepted", (data) => {
            if (data.orderId === orderId) {
                console.log("✅ Auction accepted at price:", data.acceptedPrice);
                setIsActive(false);
                setCurrentPrice(data.acceptedPrice);
                setAuctionProgress(100);
                setTimeRemaining(0);
                setIsAccepted(true);
                setAcceptedPrice(data.acceptedPrice);
                setAcceptedBy(data.resolverAddress);
                onAuctionComplete?.(data.acceptedPrice);
            }
        });

        socket.on("orderAccepted", (data) => {
            if (data.orderId === orderId) {
                console.log("✅ Order accepted:", data);
                setIsAccepted(true);
                setAcceptedPrice(data.acceptedPrice);
                setAcceptedBy(data.resolverAddress);
            }
        });

        socket.on("orderFulfilled", (data) => {
            if (data.orderId === orderId) {
                console.log("🎉 Order fulfilled:", data);
                setIsFulfilled(true);
                setFulfillmentData({
                    transactionId: data.transactionHash || '',
                    payoutId: data.payoutId || '',
                    status: 'fulfilled',
                    utr: data.utr,
                    amount: data.amount || 0,
                    timestamp: data.timestamp || new Date().toISOString()
                });
            }
        });

        socket.on("auctionEnded", (data) => {
            if (data.orderId === orderId) {
                console.log("🏁 Auction ended:", data.reason);
                setIsActive(false);
                setAuctionProgress(100);
                setTimeRemaining(0);
                if (data.reason === "timeout") {
                    setCurrentPrice(endPrice);
                }
            }
        });

        return () => {
            socket.disconnect();
        };
    }, [orderId, endPrice, onAuctionComplete]);

    const startAuction = async () => {
        try {
            const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:5001";
            const response = await fetch(`${backendUrl}/api/orders/${orderId}/start-auction`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ duration: 5000 }),
            });

            const result = await response.json();
            if (result.success) {
                console.log("🚀 Dutch auction started successfully");
            } else {
                console.error("❌ Failed to start auction:", result.message);
            }
        } catch (error) {
            console.error("❌ Error starting auction:", error);
        }
    };

    const formatPrice = (price: number) => {
        return new Intl.NumberFormat("en-IN", {
            style: "currency",
            currency: "INR",
            minimumFractionDigits: 2,
        }).format(price);
    };

    const formatTime = (ms: number) => {
        return `${(ms / 1000).toFixed(1)}s`;
    };

    // Chart data
    const chartData = {
        labels: priceHistory.map(p => formatTime(p.time)),
        datasets: [
            {
                label: "Price (INR)",
                data: priceHistory.map(p => p.price),
                borderColor: "rgb(75, 192, 192)",
                backgroundColor: "rgba(75, 192, 192, 0.2)",
                borderWidth: 2,
                tension: 0.1,
                pointRadius: 1,
            },
        ],
    };

    const chartOptions = {
        responsive: true,
        plugins: {
            legend: {
                position: "top" as const,
            },
            title: {
                display: true,
                text: "Real-time Price Movement",
            },
        },
        scales: {
            y: {
                beginAtZero: false,
                min: endPrice * 0.95,
                max: startPrice * 1.05,
                title: {
                    display: true,
                    text: "Price (INR)",
                },
            },
            x: {
                title: {
                    display: true,
                    text: "Time",
                },
            },
        },
        animation: {
            duration: 0, // Disable animations for real-time updates
        },
    };

    return (
        <Card className="w-full max-w-4xl mx-auto">
            <CardHeader>
                <CardTitle className="flex items-center justify-between">
                    <span>Dutch Auction</span>
                    <div className="flex gap-2">
                        <Badge variant={isConnected ? "default" : "destructive"}>
                            {isConnected ? "Connected" : "Disconnected"}
                        </Badge>
                        <Badge variant={isActive ? "default" : "secondary"}>
                            {isActive ? "Active" : hasStarted ? "Ended" : "Not Started"}
                        </Badge>
                    </div>
                </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
                {/* Auction Controls */}
                <div className="flex justify-between items-center">
                    <div className="space-y-1">
                        <p className="text-sm text-gray-600">Order ID</p>
                        <p className="font-mono text-sm">{orderId}</p>
                    </div>
                    {!hasStarted && (
                        <Button 
                            onClick={startAuction} 
                            disabled={!isConnected}
                            className="bg-blue-600 hover:bg-blue-700"
                        >
                            Start Dutch Auction
                        </Button>
                    )}
                </div>

                {/* Price Information */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="text-center p-4 bg-green-50 rounded-lg">
                        <p className="text-sm text-gray-600">Start Price</p>
                        <p className="text-2xl font-bold text-green-600">
                            {formatPrice(startPrice)}
                        </p>
                    </div>
                    <div className="text-center p-4 bg-blue-50 rounded-lg">
                        <p className="text-sm text-gray-600">Current Price</p>
                        <p className="text-3xl font-bold text-blue-600">
                            {formatPrice(currentPrice)}
                        </p>
                    </div>
                    <div className="text-center p-4 bg-red-50 rounded-lg">
                        <p className="text-sm text-gray-600">End Price</p>
                        <p className="text-2xl font-bold text-red-600">
                            {formatPrice(endPrice)}
                        </p>
                    </div>
                </div>

                {/* Progress and Time */}
                {hasStarted && (
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <div className="flex justify-between text-sm">
                                <span>Progress</span>
                                <span>{auctionProgress.toFixed(1)}%</span>
                            </div>
                            <Progress value={auctionProgress} className="h-3" />
                        </div>
                        <div className="text-center">
                            <p className="text-sm text-gray-600">Time Remaining</p>
                            <p className="text-xl font-bold text-orange-600">
                                {formatTime(timeRemaining)}
                            </p>
                        </div>
                    </div>
                )}

                {/* Price Chart */}
                {priceHistory.length > 1 && (
                    <div className="mt-6">
                        <h3 className="text-lg font-semibold mb-4">Price Movement</h3>
                        <div className="h-64">
                            <Line data={chartData} options={chartOptions} />
                        </div>
                    </div>
                )}

                {/* Status Messages */}
                {!isConnected && (
                    <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                        <p className="text-red-700">
                            ⚠️ Not connected to auction server. Please check your connection.
                        </p>
                    </div>
                )}

                {!hasStarted && isConnected && (
                    <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                        <p className="text-blue-700">
                            📢 Click &quot;Start Dutch Auction&quot; to begin the 5-second price decline from{" "}
                            {formatPrice(startPrice)} to {formatPrice(endPrice)}.
                        </p>
                    </div>
                )}

                {isActive && (
                    <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                        <p className="text-green-700">
                            🔥 Auction is live! Price is decreasing. Resolvers can accept at any moment.
                        </p>
                    </div>
                )}

                {!isActive && hasStarted && (
                    <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
                        <p className="text-gray-700">
                            ✅ Auction completed at {formatPrice(currentPrice)}.
                        </p>
                    </div>
                )}

                {/* Acceptance Details */}
                {isAccepted && (
                    <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                        <h3 className="text-lg font-semibold text-green-800 mb-2">🎯 Order Accepted!</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                            <div>
                                <p className="text-gray-600">Accepted Price:</p>
                                <p className="font-bold text-green-700">{formatPrice(acceptedPrice || 0)}</p>
                            </div>
                            <div>
                                <p className="text-gray-600">Accepted By:</p>
                                <p className="font-mono text-xs">{acceptedBy}</p>
                            </div>
                        </div>
                    </div>
                )}

                {/* Fulfillment Details */}
                {isFulfilled && fulfillmentData && (
                    <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                        <h3 className="text-lg font-semibold text-blue-800 mb-2">🎉 Order Fulfilled!</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                            <div>
                                <p className="text-gray-600">Payout ID:</p>
                                <p className="font-bold text-blue-700">{fulfillmentData.payoutId}</p>
                            </div>
                            <div>
                                <p className="text-gray-600">Transaction:</p>
                                <p className="font-mono text-xs break-all">{fulfillmentData.transactionId}</p>
                            </div>
                            <div>
                                <p className="text-gray-600">Amount:</p>
                                <p className="font-bold text-blue-700">{formatPrice(fulfillmentData.amount)}</p>
                            </div>
                            <div>
                                <p className="text-gray-600">Status:</p>
                                <p className="font-bold text-green-600 capitalize">{fulfillmentData.status}</p>
                            </div>
                            {fulfillmentData.utr && (
                                <>
                                    <div>
                                        <p className="text-gray-600">UTR:</p>
                                        <p className="font-mono text-xs">{fulfillmentData.utr}</p>
                                    </div>
                                </>
                            )}
                            <div>
                                <p className="text-gray-600">Timestamp:</p>
                                <p className="text-xs">{new Date(fulfillmentData.timestamp).toLocaleString()}</p>
                            </div>
                        </div>
                    </div>
                )}
            </CardContent>
        </Card>
    );
};

export default DutchAuction;