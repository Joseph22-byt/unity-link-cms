import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Church, ArrowLeft, CheckCircle } from "lucide-react";
import { submitMembershipRequest } from "@/lib/membership-requests.functions";

export const Route = createFileRoute("/join")({
  head: () => ({
    meta: [
      { title: "Join Sanctuary — Church Management" },
      { name: "description", content: "Request membership or pastoral access at Sanctuary." },
    ],
  }),
  component: JoinPage,
});

function JoinPage() {
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    full_name: "",
    email: "",
    phone: "",
    requested_role: "member" as "member" | "pastor" | "staff",
    message: "",
  });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      await submitMembershipRequest({
        full_name: form.full_name.trim(),
        email: form.email.trim(),
        phone: form.phone.trim() || undefined,
        requested_role: form.requested_role,
        message: form.message.trim() || undefined,
      });
      toast.success("Request submitted successfully!");
      setSubmitted(true);
    } catch (err: any) {
      toast.error(err?.message || "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  if (submitted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-4">
        <Card className="w-full max-w-md p-8 text-center border-border">
          <CheckCircle className="w-10 h-10 text-green-500 mx-auto mb-4" />
          <h1 className="font-display text-2xl mb-2">Request Received</h1>
          <p className="text-sm text-muted-foreground mb-6">
            Thank you for your interest. Our team will review your request and contact you at <span className="font-medium text-foreground">{form.email}</span>.
          </p>
          <Link to="/">
            <Button variant="outline" className="w-full">Back to home</Button>
          </Link>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="px-6 md:px-10 py-6 flex items-center justify-between border-b border-border">
        <Link to="/" className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-md flex items-center justify-center" style={{ background: "var(--gradient-gold)" }}>
            <Church className="w-5 h-5 text-ink" />
          </div>
          <span className="font-display text-xl">Sanctuary</span>
        </Link>
        <Link to="/auth">
          <Button variant="ghost">Sign in</Button>
        </Link>
      </header>

      <main className="flex-1 flex items-center justify-center px-4 py-12">
        <Card className="w-full max-w-lg p-8 border-border">
          <Link to="/" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-4">
            <ArrowLeft className="w-4 h-4" /> Back
          </Link>
          <h1 className="font-display text-3xl mb-1">Request to Join</h1>
          <p className="text-sm text-muted-foreground mb-8">
            Fill out the form below and our team will be in touch.
          </p>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="full_name">Full name</Label>
              <Input
                id="full_name"
                required
                value={form.full_name}
                onChange={(e) => setForm({ ...form, full_name: e.target.value })}
                placeholder="Your full name"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                required
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                placeholder="you@example.com"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">Phone</Label>
              <Input
                id="phone"
                type="tel"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                placeholder="+1 (555) 000-0000"
              />
            </div>

            <div className="space-y-2">
              <Label>Role requested</Label>
              <Select
                value={form.requested_role}
                onValueChange={(v) => setForm({ ...form, requested_role: v as "member" | "pastor" | "staff" })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="member">Member</SelectItem>
                  <SelectItem value="pastor">Pastor</SelectItem>
                  <SelectItem value="staff">Staff</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="message">Message</Label>
              <Textarea
                id="message"
                value={form.message}
                onChange={(e) => setForm({ ...form, message: e.target.value })}
                placeholder="Tell us a little about yourself..."
                rows={4}
              />
            </div>

            <Button type="submit" disabled={loading} className="w-full bg-primary text-primary-foreground">
              {loading ? "Submitting…" : "Submit request"}
            </Button>
          </form>
        </Card>
      </main>
    </div>
  );
}
