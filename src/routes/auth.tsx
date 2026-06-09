import { createFileRoute, useNavigate, Link, redirect } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Church } from "lucide-react";

export const Route = createFileRoute("/auth")({
  head: () => ({ meta: [{ title: "Sign in — Sanctuary" }, { name: "description", content: "Sign in or join your church community." }] }),
  component: AuthPage,
});

function AuthPage() {
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
            <span className="font-display text-xl">Sanctuary</span>
          </Link>
          <blockquote className="font-display text-3xl leading-tight max-w-md">
            "Behold, how good and how pleasant it is for brethren to dwell together in unity."
          </blockquote>
          <p className="mt-4 text-sm text-gold/80 tracking-wider uppercase">Psalm 133:1</p>
        </div>
      </div>
      <div className="flex-1 flex items-center justify-center p-6 md:p-12">
        <Card className="w-full max-w-md p-8 border-border">
          <h1 className="font-display text-3xl mb-1">Welcome</h1>
          <p className="text-sm text-muted-foreground mb-8">Sign in to your member portal, or join the community.</p>
          <Tabs defaultValue="signin">
            <TabsList className="grid grid-cols-2 w-full mb-6">
              <TabsTrigger value="signin">Sign in</TabsTrigger>
              <TabsTrigger value="signup">Join</TabsTrigger>
            </TabsList>
            <TabsContent value="signin"><SignInForm /></TabsContent>
            <TabsContent value="signup"><SignUpForm /></TabsContent>
          </Tabs>
          <div className="my-6 flex items-center gap-3 text-xs text-muted-foreground">
            <div className="flex-1 h-px bg-border" /> OR <div className="flex-1 h-px bg-border" />
          </div>
          <Button variant="outline" className="w-full" onClick={async () => {
            const res = await lovable.auth.signInWithOAuth("google", { redirect_uri: window.location.origin + "/dashboard" });
            if (res.error) toast.error(res.error.message);
          }}>
            Continue with Google
          </Button>
        </Card>
      </div>
    </div>
  );
}

function SignInForm() {
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
      toast.success("Welcome back");
      navigate({ to: "/dashboard", replace: true });
    }}>
      <div className="space-y-2"><Label htmlFor="si-email">Email</Label><Input id="si-email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} /></div>
      <div className="space-y-2"><Label htmlFor="si-pw">Password</Label><Input id="si-pw" type="password" required value={password} onChange={(e) => setPassword(e.target.value)} /></div>
      <Button type="submit" disabled={loading} className="w-full bg-primary text-primary-foreground">{loading ? "Signing in…" : "Sign in"}</Button>
    </form>
  );
}

function SignUpForm() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ first_name: "", last_name: "", email: "", phone: "", password: "" });
  const [loading, setLoading] = useState(false);
  return (
    <form className="space-y-4" onSubmit={async (e) => {
      e.preventDefault();
      setLoading(true);
      const { data, error } = await supabase.auth.signUp({
        email: form.email,
        password: form.password,
        options: {
          emailRedirectTo: window.location.origin + "/dashboard",
          data: { first_name: form.first_name, last_name: form.last_name, phone: form.phone },
        },
      });
      if (error) return toast.error(error.message);
      // Auto-confirm is enabled, so a session is returned immediately.
      if (data.session) {
        setLoading(false);
        toast.success("Welcome to Sanctuary");
        navigate({ to: "/dashboard", replace: true });
        return;
      }
      // Fallback: sign in if no session was returned.
      const { error: signInErr } = await supabase.auth.signInWithPassword({ email: form.email, password: form.password });
      setLoading(false);
      if (signInErr) {
        toast.success("Account created — please sign in.");
        return;
      }
      toast.success("Welcome to Sanctuary");
      navigate({ to: "/dashboard", replace: true });
    }}>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2"><Label>First name</Label><Input required value={form.first_name} onChange={(e) => setForm({ ...form, first_name: e.target.value })} /></div>
        <div className="space-y-2"><Label>Last name</Label><Input required value={form.last_name} onChange={(e) => setForm({ ...form, last_name: e.target.value })} /></div>
      </div>
      <div className="space-y-2"><Label>Email</Label><Input type="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
      <div className="space-y-2"><Label>Phone</Label><Input type="tel" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></div>
      <div className="space-y-2"><Label>Password</Label><Input type="password" required minLength={6} value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} /></div>
      <Button type="submit" disabled={loading} className="w-full bg-primary text-primary-foreground">{loading ? "Creating…" : "Create account"}</Button>
    </form>
  );
}