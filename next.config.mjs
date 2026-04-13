/** @type {import('next').NextConfig} */
const nextConfig = {
  reactCompiler: true,
  // Dev HMR when using http://127.0.0.1:3000 or http://localhost:3000 (not only default hostname)
  allowedDevOrigins: ["127.0.0.1", "localhost"],
};

export default nextConfig;
