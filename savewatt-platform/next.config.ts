import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin();

const nextConfig: NextConfig = {
  // Pin the workspace root so Next ignores lockfiles above the repo.
  turbopack: { root: __dirname },
};

export default withNextIntl(nextConfig);
