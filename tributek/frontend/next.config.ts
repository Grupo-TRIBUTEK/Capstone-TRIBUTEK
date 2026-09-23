import path from "node:path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: ["192.168.1.23"],
  async rewrites() {
    return [
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
        source: "/rrhh/:path*",
        destination: "http://localhost:3001/rrhh/:path*",
      },
    ];
  },
  turbopack: {
    root: path.resolve(__dirname),
  },
};

export default nextConfig;
