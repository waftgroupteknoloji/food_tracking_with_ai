/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: [
    '@yemek-takip/api-client',
    '@yemek-takip/ai',
    '@yemek-takip/types',
    '@yemek-takip/ui-tokens',
    '@yemek-takip/utils',
    '@yemek-takip/validators',
  ],
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '*.amazonaws.com' },
      { protocol: 'https', hostname: '*.cloudfront.net' },
    ],
  },
  serverExternalPackages: ['mongoose'],
};

export default nextConfig;
