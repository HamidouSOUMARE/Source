import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // pdf-parse loads the pdfjs worker through a runtime dynamic import; bundling
  // it breaks that resolution ("Setting up fake worker failed"). Keep both on
  // native Node resolution.
  serverExternalPackages: ["pdf-parse", "pdfjs-dist"],
};

export default nextConfig;
