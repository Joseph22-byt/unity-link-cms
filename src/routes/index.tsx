import { createFileRoute } from "@tanstack/react-router";
import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Church, Heart, Users, Calendar, ShieldCheck, Sparkles, LogIn } from "lucide-react";
import hero from "@/assets/hero-cathedral.jpg";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Jessa Thetraravalar Ministries — Modern Church Management" },
      { name: "description", content: "Care for every member with reverent, modern tools — attendance, giving, ministries, and digital ID cards." },
      { property: "og:title", content: "Jessa Thetraravalar Ministries — Modern Church Management" },
      { property: "og:description", content: "Care for every member with reverent, modern tools — attendance, giving, ministries, and digital ID cards." },
    ],
  }),
  component: Index,
});

function Index() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="absolute top-0 inset-x-0 z-20 px-6 md:px-10 py-6 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-md flex items-center justify-center" style={{ background: "var(--gradient-gold)" }}>
            <Church className="w-5 h-5 text-ink" />
          </div>
          <span className="font-display text-xl text-background">Jessa Thetraravalar Ministries</span>
        </div>
        <Link to="/auth">
          <Button variant="ghost" className="text-background hover:bg-background/10 hover:text-background">Sign in</Button>
        </Link>
      </header>

      <section className="relative min-h-[88vh] flex items-end overflow-hidden">
        <img src={hero} alt="" width={1600} height={1024} className="absolute inset-0 w-full h-full object-cover" />
        <div className="absolute inset-0" style={{ background: "linear-gradient(180deg, oklch(0.18 0.03 40 / 0.55) 0%, oklch(0.18 0.03 40 / 0.85) 70%, oklch(0.18 0.03 40) 100%)" }} />
        <div className="relative z-10 max-w-6xl mx-auto w-full px-6 md:px-10 pb-20 md:pb-32 text-background">
          <div className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-gold mb-6">
            <Sparkles className="w-3.5 h-3.5" /> A house for every soul
          </div>
          <h1 className="font-display text-5xl md:text-7xl leading-[1.05] max-w-3xl">
            Shepherd your congregation with reverence and clarity.
          </h1>
          <p className="mt-6 max-w-xl text-base md:text-lg text-background/80">
            Jessa Thetraravalar Ministries brings members, ministries, attendance, and giving into one quiet, beautiful place — so you can spend more time on what matters.
          </p>
          <div className="mt-10 flex flex-wrap gap-3">
            <Link to="/auth/admin">
              <Button size="lg" className="bg-gold text-ink hover:bg-gold-soft h-12 px-7 text-base font-medium flex items-center gap-2">
                <ShieldCheck className="w-4 h-4" /> Pastor / Admin Login
              </Button>
            </Link>
            <Link to="/auth/member">
              <Button size="lg" variant="outline" className="h-12 px-7 text-base bg-transparent border-background/30 text-background hover:bg-background/10 hover:text-background flex items-center gap-2">
                <LogIn className="w-4 h-4" /> Member Login
              </Button>
            </Link>
          </div>
        </div>
      </section>

      <section className="py-24 px-6 md:px-10 bg-background">
        <div className="max-w-6xl mx-auto">
          <div className="grid md:grid-cols-3 gap-px bg-border rounded-lg overflow-hidden">
            {[
              { icon: Users, t: "Every member, known", d: "Profiles, families, ministries, milestones — kept tenderly and securely." },
              { icon: Heart, t: "Giving made gracious", d: "Tithes, offerings, recurring gifts. Receipts handled. Trust preserved." },
              { icon: Calendar, t: "Gather with intention", d: "Services, small groups, volunteer rotas — quietly orchestrated." },
              { icon: ShieldCheck, t: "Roles & permissions", d: "Pastors, finance, ministry leaders — each with the right access." },
              { icon: Sparkles, t: "Digital ID cards", d: "Beautiful, QR-verifiable membership cards in seconds." },
              { icon: Church, t: "From 100 to 50,000+", d: "Built for the smallest plant and the largest cathedral alike." },
            ].map((f, i) => (
              <div key={i} className="bg-card p-8 hover:bg-secondary/40 transition-colors">
                <f.icon className="w-6 h-6 text-gold mb-5" strokeWidth={1.5} />
                <h3 className="font-display text-xl mb-2">{f.t}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{f.d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <footer className="border-t border-border py-10 px-6 text-center text-sm text-muted-foreground">
        Built with care · Jessa Thetraravalar Ministries Church Management
      </footer>
    </div>
  );
}
