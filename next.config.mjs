import { fileURLToPath } from "url";
import { dirname } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Pin the workspace root (a stray package-lock.json exists in the home dir).
  turbopack: { root: __dirname },
};

export default nextConfig;
