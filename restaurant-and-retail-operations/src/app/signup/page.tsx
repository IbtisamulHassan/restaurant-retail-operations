"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Flame, User as UserIcon, Mail, Lock, Shield } from "lucide-react";
import { Button, Input, Select } from "@/components/ui";

export default function SignupPage() {
  const router = useRouter();
  const [form, setForm] = useState({ name: "", email: "", password: "", role: "STAFF" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    const res = await fetch("/api/auth/signup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    setLoading(false);
    const data = await res.json();
    if (!res.ok) {
      setError(data.error ?? "Signup failed");
      return;
    }
    router.push("/dashboard");
    router.refresh();
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-cream">
      <form onSubmit={submit} className="w-full max-w-sm rise-in">
        <div className="flex items-center gap-2.5 mb-8">
          <div className="size-10 rounded-xl bg-saffron flex items-center justify-center text-forest-deep">
            <Flame size={20} strokeWidth={2.5} />
          </div>
          <span className="font-display text-lg font-semibold">RestOps BD</span>
        </div>
        <h2 className="font-display text-2xl font-semibold">Create your account</h2>
        <p className="text-sm text-stone-500 mt-1 mb-6">
          The very first account becomes the <b>Owner</b>. After that, pick a role for each teammate.
        </p>
        <div className="space-y-4">
          <div className="relative">
            <UserIcon size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400" />
            <Input required placeholder="Full name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="pl-10" />
          </div>
          <div className="relative">
            <Mail size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400" />
            <Input type="email" required placeholder="Email address" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="pl-10" />
          </div>
          <div className="relative">
            <Lock size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400" />
            <Input type="password" required minLength={6} placeholder="Password (6+ characters)" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} className="pl-10" />
          </div>
          <div className="relative">
            <Shield size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400 pointer-events-none z-10" />
            <Select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })} className="pl-10">
              <option value="OWNER">Owner / Admin — full access</option>
              <option value="STAFF">Staff / Cashier — orders & customers</option>
              <option value="KITCHEN">Kitchen — live queue only</option>
            </Select>
          </div>
          {error && <p className="text-sm text-rose-600 bg-rose-50 rounded-lg px-3 py-2">{error}</p>}
          <Button type="submit" className="w-full" size="lg" loading={loading}>
            Sign up
          </Button>
        </div>
        <p className="text-sm text-stone-500 mt-5 text-center">
          Already registered?{" "}
          <Link href="/login" className="font-semibold text-leaf hover:underline">
            Sign in
          </Link>
        </p>
      </form>
    </div>
  );
}
