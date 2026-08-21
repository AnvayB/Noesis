import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Pin the workspace root explicitly so Turbopack doesn't walk up past this
  // project looking for a lockfile (there's an unrelated one in $HOME).
  turbopack: {
    root: __dirname,
  },
};

export default nextConfig;
