import type { NextConfig } from "next";
import dns from "dns";
import path from "path";

try {
  dns.setServers(["8.8.8.8", "8.8.4.4"]);
  if (dns.setDefaultResultOrder) {
    dns.setDefaultResultOrder("ipv4first");
  }
} catch (e) {
  // ignore
}

const nextConfig: NextConfig = {
  turbopack: {
    root: path.resolve(__dirname),
  },
};

export default nextConfig;
