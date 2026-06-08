if (!process.env.VITE_API_URL) {
  console.warn(
    "\n⚠️  VITE_API_URL is not set. Netlify will build the UI, but Start Verification will fail until you add your Railway URL in Netlify environment variables and redeploy.\n",
  );
}
