import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // sharp and ffmpeg-static are native/binary: keep them out of the bundle.
  serverExternalPackages: ["sharp", "ffmpeg-static"],
};

export default nextConfig;
