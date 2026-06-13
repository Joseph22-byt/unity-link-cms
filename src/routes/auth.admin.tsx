import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Church, ShieldCheck } from "lucide-react";
import { signUpAdmin } from "@/lib/admin-signup.functions";

export const Route = createFileRoute("/auth/admin")({
  head: () => ({ meta: [{ title: "Pastor / Admin Portal — Jessa Thetraravalar Ministries" }] }),
  component: AdminAuthPage,
});

function AdminAuthPage() {
  const navigate = useNavigate();
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: "/dashboard", replace: true });
    });
  }, [navigate]);

  return (
    <div className="min-h-screen flex flex-col md:flex-row">
      <div className="hidden md:flex md:w-1/2 relative items-end p-12" style={{ background: "var(--gradient-sacred)" }}>
        <div className="text-background">
          <Link to="/" className="flex items-center gap-2.5 mb-12">
            <div className="w-9 h-9 rounded-md flex items-center justify-center" style={{ background: "var(--gradient-gold)" }}>
              <Church className="w-5 h-5 text-ink" />
            </div>
            <span className="font-display text-xl">Jessa Thetraravalar Ministries</span>
          </Link>
          <div className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-gold mb-4">
            <ShieldCheck className="w-3.5 h-3.5" /> Pastoral Leadership
          </div>
          <blockquote className="font-display text-3xl leading-tight max-w-md">
            "Shepherd the flock of God which is among you, taking the oversight thereof willingly."
          </blockquote>
          <p className="mt-4 text-sm text-gold/80 tracking-wider uppercase">1 Peter 5:2</p>
        </div>
      </div>
      <div className="flex-1 flex items-center justify-center p-6 md:p-12">
        <Card className="w-full max-w-md p-8 border-border">
          <div className="flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-gold mb-2">
            <ShieldCheck className="w-3.5 h-3.5" /> Admin Portal
          </div>
          <h1 className="font-display text-3xl mb-1">Pastor / Admin</h1>
          <p className="text-sm text-muted-foreground mb-8">Sign in or create an administrator account.</p>
          <Tabs defaultValue="signin">
            <TabsList className="grid grid-cols-2 w-full mb-6">
              <TabsTrigger value="signin">Admin sign in</TabsTrigger>
              <TabsTrigger value="signup">Create admin</TabsTrigger>
            </TabsList>
            <TabsContent value="signin"><AdminSignIn /></TabsContent>
            <TabsContent value="signup"><AdminSignUp /></TabsContent>
          </Tabs>
          <p className="text-xs text-muted-foreground mt-6 text-center">
            Not staff? <Link to="/auth/member" className="text-gold hover:underline">Member portal</Link>
          </p>
        </Card>
      </div>
    </div>
  );
}

function AdminSignIn() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  return (
    <form className="space-y-4" onSubmit={async (e) => {
      e.preventDefault();
      setLoading(true);
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      setLoading(false);
      if (error) return toast.error(error.message);
      toast.success("Welcome, pastor");
      navigate({ to: "/dashboard", replace: true });
    }}>
      <div className="space-y-2"><Label>Email</Label><Input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} /></div>
      <div className="space-y-2"><Label>Password</Label><Input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} /></div>
      <Button type="submit" disabled={loading} className="w-full bg-primary text-primary-foreground">{loading ? "Signing in…" : "Sign in"}</Button>
    </form>
  );
}

function AdminSignUp() {
  const navigate = useNavigate();
  const createAdmin = useServerFn(signUpAdmin);
  const [form, setForm] = useState({ first_name: "", last_name: "", email: "", password: "" });
  const [loading, setLoading] = useState(false);
  return (
    <form className="space-y-4" onSubmit={async (e) => {
      e.preventDefault();
      setLoading(true);
      try {
        await createAdmin({ data: form });
        const { error } = await supabase.auth.signInWithPassword({ email: form.email, password: form.password });
        if (error) throw error;
        toast.success("Admin account created");
        navigate({ to: "/dashboard", replace: true });
      } catch (err: any) {
        toast.error(err?.message ?? "Could not create admin account");
      } finally {
        setLoading(false);
      }
    }}>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2"><Label>First name</Label><Input required value={form.first_name} onChange={(e) => setForm({ ...form, first_name: e.target.value })} /></div>
        <div className="space-y-2"><Label>Last name</Label><Input required value={form.last_name} onChange={(e) => setForm({ ...form, last_name: e.target.value })} /></div>
      </div>
      <div className="space-y-2"><Label>Email</Label><Input type="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
      <div className="space-y-2"><Label>Password</Label><Input type="password" required minLength={6} value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} /></div>
      <Button type="submit" disabled={loading} className="w-full bg-primary text-primary-foreground">{loading ? "Creating admin…" : "Create admin account"}</Button>
    </form>
  );
}