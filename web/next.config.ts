import type { NextConfig } from "next";

const nextConfig: NextConfig = {
    /* config options here */
    output: 'export',

    // 2. 如果你的项目使用了 Next.js 的 <Image> 组件，且没有外部图片服务，
    // 必须关闭优化，否则静态构建可能报错或图片无法显示。
    images: {
        unoptimized: true,
    },

    async rewrites() {
        return [
            {
                source: '/v1/:path*',
                destination: 'http://localhost:8000/v1/:path*' // Proxy to Backend
            }
        ]
    }
};

export default nextConfig;
