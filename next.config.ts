import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactCompiler: true,
  // No anunciar el framework: le ahorra trabajo de reconocimiento a un atacante.
  poweredByHeader: false,
  serverExternalPackages: ["@prisma/client", "prisma"],
  images: {
    qualities: [75, 90],
    remotePatterns: [
      {
        protocol: "https",
        hostname: "res.cloudinary.com",
        pathname: "/**",
      },
    ],
  },
};

export default nextConfig;
