import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Shield, LogIn } from "lucide-react";

function getOAuthUrl() {
  const authUrl = import.meta.env.VITE_KIMI_AUTH_URL;
  const appID = import.meta.env.VITE_APP_ID;
  const redirectUri = `${window.location.origin}/api/oauth/callback`;
  const state = btoa(redirectUri);

  const url = new URL(`${authUrl}/api/oauth/authorize`);
  url.searchParams.set("client_id", appID);
  url.searchParams.set("redirect_uri", redirectUri);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", "profile");
  url.searchParams.set("state", state);

  return url.toString();
}

export default function Login() {
  return (
    <div className="min-h-[calc(100vh-8rem)] flex items-center justify-center px-4">
      <Card className="w-full max-w-sm border-slate-800 bg-slate-900/50">
        <CardHeader className="text-center space-y-3">
          <div className="w-14 h-14 rounded-2xl bg-sky-500/10 flex items-center justify-center mx-auto border border-sky-500/20">
            <Shield className="w-7 h-7 text-sky-400" />
          </div>
          <CardTitle className="text-slate-100 text-xl">Welcome</CardTitle>
          <p className="text-sm text-slate-400">Sign in to access your verification dashboard</p>
        </CardHeader>
        <CardContent>
          <Button
            className="w-full bg-sky-500 hover:bg-sky-600 text-white"
            size="lg"
            onClick={() => {
              window.location.href = getOAuthUrl();
            }}
          >
            <LogIn className="w-4 h-4 mr-2" />
            Sign In
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
