/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  webpack: (config, { dev }) => {
    if (dev) {
      // Use memory cache in dev to avoid stale .next pack file ENOENT issues.
      config.cache = { type: "memory" }
    }
    return config
  },
  serverExternalPackages: ["pdf-parse"]
}

export default nextConfig