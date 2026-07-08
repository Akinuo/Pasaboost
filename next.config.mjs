/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,

  // Allow Supabase storage / Google avatar images if used later
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '*.supabase.co' },
      { protocol: 'https', hostname: 'lh3.googleusercontent.com' },
    ],
  },

  // Silence workspace-root inference warnings in some environments
  outputFileTracingRoot: undefined,
}

export default nextConfig
