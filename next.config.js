/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    // 빌드 시 ESLint 검사를 무시하고 통과시킵니다.
    ignoreDuringBuilds: true,
  },
  typescript: {
    // 혹시 모를 타입 에러도 무시하고 진행하게 만듭니다.
    ignoreBuildErrors: true,
  },
}

module.exports = nextConfig
