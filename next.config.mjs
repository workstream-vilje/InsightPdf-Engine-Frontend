/** @type {import('next').NextConfig} */
const nextConfig = {
  reactCompiler: true,
  // Allow HMR when opening the dev app via LAN IP (e.g. http://192.168.0.14:3000)
  allowedDevOrigins: ["192.168.0.14"],
};

export default nextConfig;
