import { useState } from "react";
import { trpc } from "@/providers/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Lock } from "lucide-react";

export default function AdminLoginGate({
  onSuccess,
  title = "Admin only",
  description = "Enter the admin password to continue.",
}: {
  onSuccess: () => void;
  title?: string;
  description?: string;
}) {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const loginMutation = trpc.admin.login.useMutation({
    onSuccess: () => {
      setError("");
      onSuccess();
    },
    onError: (err) => setError(err.message),
  });

  return (
    <div className="max-w-sm mx-auto glass-card p-8 space-y-5">
      <div className="text-center space-y-2">
        <div className="w-14 h-14 rounded-2xl bg-violet-500/15 flex items-center justify-center mx-auto border border-violet-500/25">
          <Lock className="w-7 h-7 text-violet-400" />
        </div>
        <h1 className="text-xl font-bold text-slate-100">{title}</h1>
        <p className="text-sm text-slate-400">{description}</p>
      </div>
      <div className="space-y-2">
        <Label htmlFor="admin-password" className="text-slate-300">
          Admin password
        </Label>
        <Input
          id="admin-password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="bg-slate-900 border-slate-700 text-slate-100"
          onKeyDown={(e) => e.key === "Enter" && loginMutation.mutate({ password })}
        />
      </div>
      {error && (
        <p className="text-sm text-red-400 bg-red-500/10 rounded-lg px-3 py-2 break-words">{error}</p>
      )}
      <Button
        className="w-full btn-glow"
        disabled={!password || loginMutation.isPending}
        onClick={() => loginMutation.mutate({ password })}
      >
        {loginMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Unlock"}
      </Button>
    </div>
  );
}
