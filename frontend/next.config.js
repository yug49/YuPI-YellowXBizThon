/** @type {import('next').NextConfig} */
const nextConfig = {
    webpack: (config, { isServer }) => {
        // Fix for pino-pretty and react-native-async-storage warnings
        config.resolve.fallback = {
            ...config.resolve.fallback,
            "pino-pretty": false,
            "@react-native-async-storage/async-storage": false,
        };

        if (!isServer) {
            config.resolve.fallback = {
                ...config.resolve.fallback,
                fs: false,
                net: false,
                tls: false,
            };
        }

        return config;
    },
};

module.exports = nextConfig;
