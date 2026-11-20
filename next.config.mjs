import { initOpenNextCloudflareForDev } from '@opennextjs/cloudflare';

/** @type {import('next').NextConfig} */
const nextConfig = {
  // 播放源图片域名不固定，关闭 Next 图片优化以避免远程域名白名单问题
  images: { unoptimized: true },
  eslint: { ignoreDuringBuilds: true },
  poweredByHeader: false,
};

// 构建时不需要，仅在 next dev 时初始化 Cloudflare 绑定模拟
if (process.env.NODE_ENV === 'development') {
  initOpenNextCloudflareForDev();
}

export default nextConfig;
