"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Flame, Mail, Lock } from "lucide-react";
import { Button, Input } from "@/components/ui";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    setLoading(false);
    if (!res.ok) {
      const data = await res.json();
      setError(data.error ?? "Login failed");
      return;
    }
    router.push("/dashboard");
    router.refresh();
  };

  return (
    <div className="min-h-screen flex items-stretch">
      {/* brand panel */}
      <div className="hidden md:flex flex-col justify-between w-[46%] bg-forest text-cream p-10 relative overflow-hidden">
        <div className="absolute -right-24 -bottom-24 size-96 rounded-full bg-leaf/30 blur-3xl" />
        <div className="absolute -left-16 -top-16 size-72 rounded-full bg-saffron/20 blur-3xl" />
        <div className="flex items-center gap-3 relative">
          <div className="size-11 rounded-2xl bg-saffron flex items-center justify-center text-forest-deep">
            <Flame size={22} strokeWidth={2.5} />
          </div>
          <span className="font-display text-xl font-semibold">RestOps BD</span>
        </div>
        <div className="relative">
          <h1 className="font-display text-4xl xl:text-5xl font-semibold leading-tight">
            Run your restaurant
            <br />
            <span className="text-saffron">smarter.</span>
          </h1>
          <p className="mt-4 text-cream/70 text-sm leading-relaxed max-w-sm">
            Recipe costing, QR table ordering, loyalty CRM and AI-assisted demand forecasting —
            built for Bangladeshi restaurants, fast-food shops and grocery stores.
          </p>
          <div className="mt-8 grid grid-cols-3 gap-3 text-center">
            {[
              ["৳ BDT", "Native currency"],
              ["QR", "Guest ordering"],
              ["EN · বাং", "Bilingual UI"],
            ].map(([a, b]) => (
              <div key={a} className="rounded-xl bg-cream/5 border border-cream/10 px-2 py-3">
                <p className="font-display font-semibold">{a}</p>
                <p className="text-[10px] text-cream/50 mt-0.5">{b}</p>
              </div>
            ))}
          </div>
        </div>
        <p className="text-[11px] text-cream/40 relative">Dhaka · Chattogram · Sylhet · Khulna</p>
      </div>

      {/* form panel */}
      <div className="flex-1 flex items-center justify-center p-6">
        <form onSubmit={submit} className="w-full max-w-sm rise-in">
          <div className="md:hidden flex items-center gap-2.5 mb-8">
            <div className="size-10 rounded-xl bg-saffron flex items-center justify-center text-forest-deep">
              <Flame size={20} strokeWidth={2.5} />
            </div>
            <span className="font-display text-lg font-semibold">RestOps BD</span>
          </div>
          <h2 className="font-display text-2xl font-semibold">Welcome back</h2>
          <p className="text-sm text-stone-500 mt-1 mb-6">Sign in to your operations dashboard.</p>

          <div className="space-y-4">
            <div className="relative">
              <Mail size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400" />
              <Input type="email" required placeholder="Email address" value={email} onChange={(e) => setEmail(e.target.value)} className="pl-10" autoComplete="email" />
            </div>
            <div className="relative">
              <Lock size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400" />
              <Input type="password" required placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} className="pl-10" autoComplete="current-password" />
            </div>
            {error && <p className="text-sm text-rose-600 bg-rose-50 rounded-lg px-3 py-2">{error}</p>}
            <Button type="submit" className="w-full" size="lg" loading={loading}>
              Sign in
            </Button>
          </div>

          <p className="text-sm text-stone-500 mt-5 text-center">
            New here?{" "}
            <Link href="/signup" className="font-semibold text-leaf hover:underline">
              Create an account
            </Link>
          </p>

          <div className="mt-8 rounded-xl bg-cream-dark/70 border border-stone-200 p-3.5 text-xs text-stone-500 leading-relaxed">
            <p className="font-bold text-stone-600 mb-1">Demo accounts</p>
            <p>Owner — owner@dhakaflavours.com / admin123</p>
            <p>Staff — staff@dhakaflavours.com / staff123</p>
            <p>Kitchen — kitchen@dhakaflavours.com / kitchen123</p>
          </div>
        </form>
      </div>
    </div>
  );
}
