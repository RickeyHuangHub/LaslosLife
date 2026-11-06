/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  output: 'export',
  webpack: (config, { dev }) => {
    if (!dev) {
      // Production only: drop console logs and minimize for obfuscation
      config.optimization.minimizer.forEach((plugin) => {
        if (plugin.constructor.name === 'TerserPlugin') {
          plugin.options.terserOptions = {
            ...plugin.options.terserOptions,
            compress: {
              ...plugin.options.terserOptions?.compress,
              drop_console: true,
              drop_debugger: true,
              passes: 2,
            },
            format: {
              ...plugin.options.terserOptions?.format,
              comments: false,
            },
            mangle: {
              ...plugin.options.terserOptions?.mangle,
              toplevel: true,
            },
          };
        }
      });
    }
    return config;
  },
};

export default nextConfig;
