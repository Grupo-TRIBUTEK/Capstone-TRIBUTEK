import path from "node:path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: ["192.168.1.23", "127.0.0.1"],
  async rewrites() {
    return [
      { source: "/payment-evidence/:path*", destination: "http://localhost:3001/payment-evidence/:path*" },
      {
        source: "/auth/:path*",
        destination: "http://localhost:3001/auth/:path*",
      },
      {
        source: "/clientes/:path*",
        destination: "http://localhost:3001/clientes/:path*",
      },
      {
        source: "/servicios/:path*",
        destination: "http://localhost:3001/servicios/:path*",
      },
      {
        source: "/documentos/:path*",
        destination: "http://localhost:3001/documentos/:path*",
      },
      {
        source: "/gestiones/:path*",
        destination: "http://localhost:3001/gestiones/:path*",
      },
    ];
  },
  turbopack: {
    root: path.resolve(__dirname),
  },
};

export default nextConfig;
