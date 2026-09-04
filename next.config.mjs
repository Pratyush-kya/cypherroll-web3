/** @type {import('next').NextConfig} */
const nextConfig = {
  output: process.env.BUILD_STANDALONE ? 'standalone' : undefined,
  reactStrictMode: true,
  transpilePackages: ['three'],
  webpack: (config) => {
    config.resolve.fallback = {
      ...config.resolve.fallback,
      fs: false,
      net: false,
      tls: false,
      crypto: false,
    };
    config.resolve.alias = {
      ...config.resolve.alias,
      '@x402/core/client': false,
      '@x402/evm/exact/client': false,
      '@x402/evm/upto/client': false,
      '@x402/svm/exact/client': false,
      '@x402/evm': false,
      '@react-native-async-storage/async-storage': false,
    };
    config.externals.push('pino-pretty', 'lokijs', 'encoding');
    return config;
  },
};

export default nextConfig;
