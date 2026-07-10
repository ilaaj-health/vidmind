// Explicit config path: the dev/build server may run with cwd = repo root
// (launch.json runs `next dev frontend`), where a bare lookup misses it.
module.exports = {
  plugins: {
    tailwindcss: { config: require("path").join(__dirname, "tailwind.config.js") },
    autoprefixer: {},
  },
};
