import { useState } from "react";
import { useNavigate } from "react-router";
import { trpc } from "@/providers/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowRight, Shield } from "lucide-react";

export default function Start() {
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");

  const createMutation = trpc.verification.create.useMutation({
    onSuccess: (data) => {
      localStorage.setItem("verificationId", data.id.toString());
      localStorage.setItem("verificationName", name);
      navigate("/verify");
    },
    onError: (err) => {
      const msg = err.message.toLowerCase();
      if (
        msg.includes("expected pattern") ||
        msg.includes("failed to fetch") ||
        msg.includes("json") ||
        msg.includes("network")
      ) {
        setError(
          "Could not reach the verification server. Ensure Railway is running and Netlify has RAILWAY_API_URL set to your Railway URL.",
        );
        return;
      }
      setError(err.message);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!name.trim() || !email.trim()) {
      setError("Please fill in all fields");
      return;
    }
    createMutation.mutate({ name: name.trim(), email: email.trim() });
  };

  return (
    <div className="min-h-[calc(100vh-8rem)] flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="w-14 h-14 rounded-2xl bg-sky-500/10 flex items-center justify-center mx-auto mb-4">
            <Shield className="w-7 h-7 text-sky-400" />
          </div>
          <h1 className="text-2xl font-bold text-slate-100 mb-2">
            Enter your details to start verification
          </h1>
          <p className="text-slate-400 text-sm">Get Started — Takes less than 5 minutes</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor="name" className="text-slate-300">
              Full Name
            </Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="John Doe"
              className="bg-slate-900 border-slate-700 text-slate-100 placeholder:text-slate-600 focus-visible:ring-sky-500"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email" className="text-slate-300">
              Email Address
            </Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="john@example.com"
              className="bg-slate-900 border-slate-700 text-slate-100 placeholder:text-slate-600 focus-visible:ring-sky-500"
            />
          </div>

          {error && (
            <div className="text-sm text-red-400 bg-red-500/10 rounded-lg px-3 py-2">
              {error}
            </div>
          )}

          <Button
            type="submit"
            className="w-full bg-sky-500 hover:bg-sky-600 text-white"
            disabled={createMutation.isPending}
          >
            {createMutation.isPending ? "Starting..." : "Start Verification"}
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </form>
      </div>
    </div>
  );
}
