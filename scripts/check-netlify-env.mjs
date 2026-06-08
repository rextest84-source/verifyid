const railwayUrl = process.env.RAILWAY_API_URL?.trim();
const viteUrl = process.env.VITE_API_URL?.trim();

if (!railwayUrl && !viteUrl) {
  console.warn(
    "\n⚠️  RAILWAY_API_URL is not set in Netlify. The site will build, but /api requests will fail until you add your Railway URL under Site configuration → Environment variables, then redeploy.\n",
  );
}
