/**
 * Yellow Network Session UI Components
 * Display Yellow Network session status and performance improvements
 */

export function YellowSessionStatus({
    orderId,
    sessionId = null,
    orderData = null,
}) {
    const hasYellowSession = sessionId || orderData?.yellowNetwork?.sessionId;
    const isInstant = orderData?.yellowNetwork?.instant || false;

    return (
        <div className="bg-gradient-to-r from-yellow-50 to-orange-50 border border-yellow-200 rounded-lg p-4 mb-4">
            <div className="flex items-center justify-between mb-2">
                <div className="flex items-center">
                    <div
                        className={`w-3 h-3 rounded-full mr-2 ${
                            hasYellowSession
                                ? "bg-yellow-500 animate-pulse"
                                : "bg-gray-300"
                        }`}
                    ></div>
                    <span className="font-medium text-yellow-800">
                        ⚡ Yellow Network
                    </span>
                </div>
                <span
                    className={`text-xs px-2 py-1 rounded-full ${
                        isInstant
                            ? "bg-green-100 text-green-700"
                            : "bg-gray-100 text-gray-600"
                    }`}
                >
                    {isInstant ? "INSTANT" : "STANDARD"}
                </span>
            </div>

            {hasYellowSession ? (
                <div className="space-y-2">
                    <div className="text-sm text-yellow-700">
                        <strong>Session ID:</strong>{" "}
                        {(
                            sessionId ||
                            orderData?.yellowNetwork?.sessionId ||
                            ""
                        ).slice(0, 16)}
                        ...
                    </div>
                    <div className="text-sm text-yellow-700">
                        <strong>Settlement:</strong> ~5 seconds via state
                        channels
                    </div>
                    <div className="text-xs text-yellow-600">
                        ⚡ 85% faster than traditional blockchain settlements
                    </div>
                </div>
            ) : (
                <div className="text-sm text-gray-600">
                    Standard blockchain settlement (20-30 seconds)
                </div>
            )}
        </div>
    );
}

export function YellowConnectionIndicator({ status, performance = null }) {
    const getStatusColor = () => {
        switch (status) {
            case "connected":
                return "bg-green-100 text-green-700 border-green-200";
            case "connecting":
                return "bg-yellow-100 text-yellow-700 border-yellow-200";
            case "disconnected":
                return "bg-red-100 text-red-700 border-red-200";
            default:
                return "bg-gray-100 text-gray-700 border-gray-200";
        }
    };

    return (
        <div
            className={`inline-flex items-center px-3 py-2 rounded-lg border text-sm font-medium ${getStatusColor()}`}
        >
            {status === "connected" && <span className="mr-2">⚡</span>}
            {status === "connecting" && (
                <div className="w-3 h-3 border-2 border-yellow-600 border-t-transparent rounded-full animate-spin mr-2"></div>
            )}
            {status === "disconnected" && <span className="mr-2">⚠️</span>}

            <span>
                Yellow Network:{" "}
                {status.charAt(0).toUpperCase() + status.slice(1)}
            </span>

            {performance && status === "connected" && (
                <span className="ml-2 text-xs bg-white bg-opacity-50 px-2 py-1 rounded">
                    {performance.improvement}
                </span>
            )}
        </div>
    );
}

export function PerformanceComparison({ orderData }) {
    const hasYellow = orderData?.yellowNetwork?.sessionId;

    return (
        <div className="bg-white border border-gray-200 rounded-lg p-4">
            <h4 className="font-medium text-gray-900 mb-3">
                Settlement Performance
            </h4>

            <div className="grid grid-cols-2 gap-4">
                {/* Traditional */}
                <div
                    className={`p-3 rounded-lg border ${
                        !hasYellow
                            ? "border-blue-200 bg-blue-50"
                            : "border-gray-200 bg-gray-50"
                    }`}
                >
                    <div className="flex items-center mb-2">
                        <div className="w-2 h-2 bg-gray-400 rounded-full mr-2"></div>
                        <span className="text-sm font-medium text-gray-700">
                            Traditional
                        </span>
                    </div>
                    <div className="text-lg font-bold text-gray-900 mb-1">
                        20-30s
                    </div>
                    <div className="text-xs text-gray-600">
                        Blockchain confirmations
                    </div>
                </div>

                {/* Yellow Network */}
                <div
                    className={`p-3 rounded-lg border ${
                        hasYellow
                            ? "border-yellow-200 bg-yellow-50"
                            : "border-gray-200 bg-gray-50"
                    }`}
                >
                    <div className="flex items-center mb-2">
                        <div
                            className={`w-2 h-2 rounded-full mr-2 ${
                                hasYellow ? "bg-yellow-500" : "bg-gray-400"
                            }`}
                        ></div>
                        <span className="text-sm font-medium text-yellow-800">
                            Yellow Network
                        </span>
                    </div>
                    <div className="text-lg font-bold text-yellow-900 mb-1">
                        ~5s
                    </div>
                    <div className="text-xs text-yellow-700">
                        State channels
                    </div>
                </div>
            </div>

            {hasYellow && (
                <div className="mt-3 p-2 bg-green-50 border border-green-200 rounded text-center">
                    <span className="text-sm font-medium text-green-700">
                        🚀 85% faster settlement active!
                    </span>
                </div>
            )}
        </div>
    );
}

export default {
    YellowSessionStatus,
    YellowConnectionIndicator,
    PerformanceComparison,
};
