import { useEffect, useRef, useState } from "react";
import QRCode from "qrcode";
import { Church, ShieldCheck } from "lucide-react";

type Member = {
  first_name: string | null;
  last_name: string | null;
  membership_id: string;
  ministry?: string | null;
  status: string;
  member_since?: string | null;
  photo_signed_url?: string | null;
};

export function MemberIdCard({ member, verifyUrl }: { member: Member; verifyUrl: string }) {
  const [qr, setQr] = useState<string>("");
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    QRCode.toDataURL(verifyUrl, { margin: 0, width: 220, color: { dark: "#1a1410", light: "#ffffff" } }).then(setQr);
  }, [verifyUrl]);

  const initials = `${member.first_name?.[0] ?? ""}${member.last_name?.[0] ?? ""}`.toUpperCase();
  const year = member.member_since ? new Date(member.member_since).getFullYear() : "—";

  return (
    <div
      ref={ref}
      className="relative w-full max-w-[420px] aspect-[1.586/1] rounded-2xl overflow-hidden shadow-2xl"
      style={{ background: "var(--gradient-sacred)" }}
    >
      <div className="absolute inset-0 opacity-10" style={{ backgroundImage: "radial-gradient(circle at 80% 20%, var(--gold) 0%, transparent 50%)" }} />
      <div className="relative h-full flex flex-col p-5 text-background">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded flex items-center justify-center" style={{ background: "var(--gradient-gold)" }}>
              <Church className="w-3.5 h-3.5 text-ink" />
            </div>
            <div>
              <div className="font-display text-sm leading-none">Sanctuary</div>
              <div className="text-[9px] uppercase tracking-[0.2em] opacity-60 mt-0.5">Member Card</div>
            </div>
          </div>
          <span className="text-[9px] uppercase tracking-[0.2em] text-gold flex items-center gap-1">
            <ShieldCheck className="w-3 h-3" /> Verified
          </span>
        </div>

        <div className="flex-1 flex items-center gap-4 mt-3">
          <div className="w-20 h-24 rounded-md overflow-hidden flex-shrink-0 bg-background/10 border border-background/20 flex items-center justify-center font-display text-2xl">
            {member.photo_signed_url ? (
              <img src={member.photo_signed_url} alt="" crossOrigin="anonymous" className="w-full h-full object-cover" />
            ) : (
              <span className="text-gold">{initials || "·"}</span>
            )}
          </div>
          <div className="min-w-0 flex-1">
            <div className="font-display text-xl leading-tight truncate">{member.first_name} {member.last_name}</div>
            {member.ministry && <div className="text-[10px] uppercase tracking-wider opacity-70 mt-1 truncate">{member.ministry}</div>}
            <div className="mt-2 text-[10px] opacity-60">Member since {year}</div>
            <div className="mt-1 font-mono text-xs text-gold">{member.membership_id}</div>
          </div>
        </div>

        <div className="flex items-end justify-between mt-2">
          <div className="text-[9px] opacity-50 max-w-[60%] leading-snug">
            Scan to verify membership at sanctuary.church
          </div>
          {qr && (
            <div className="bg-white p-1.5 rounded">
              <img src={qr} alt="QR" className="w-14 h-14" />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}