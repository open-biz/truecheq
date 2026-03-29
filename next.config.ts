import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  // Enable webpack config for WASM support
  webpack: (config, { isServer }) => {
    // Enable async WebAssembly for XMTP SDKs
    config.experiments = {
      ...config.experiments,
      asyncWebAssembly: true,
    };
    
    // Mark @xmtp/node-sdk as external to prevent bundling issues
    if (!isServer) {
      config.externals = [...(config.externals || []), '@xmtp/node-sdk'];
    }
    
    return config;
  },
};

export default nextConfig;
