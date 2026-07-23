import type { NextConfig } from "next";
import dns from "dns";

dns.setServers(["8.8.8.8", "4.4.4.4"]);

const nextConfig: NextConfig = {};

export default nextConfig;
