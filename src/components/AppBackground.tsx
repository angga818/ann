/** Latar belakang bermuara halus — gradien radial + grid + noise tipis. */
export function AppBackground() {
  return (
    <div aria-hidden className="fixed inset-0 -z-10 overflow-hidden bg-background">
      {/* glow ungu kiri atas */}
      <div className="absolute -top-40 left-[-15%] h-[34rem] w-[34rem] rounded-full bg-violet-600/20 blur-[120px]" />
      {/* glow cyan kanan bawah */}
      <div className="absolute -bottom-52 right-[-12%] h-[38rem] w-[38rem] rounded-full bg-cyan-500/12 blur-[130px]" />
      {/* glow fuchsia tengah */}
      <div className="absolute left-1/2 top-1/3 h-[26rem] w-[40rem] -translate-x-1/2 rounded-full bg-fuchsia-600/8 blur-[110px]" />

      {/* grid halus dengan mask */}
      <div
        className="absolute inset-0 opacity-[0.35]"
        style={{
          backgroundImage:
            "linear-gradient(to right, rgba(255,255,255,0.035) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,0.035) 1px, transparent 1px)",
          backgroundSize: "56px 56px",
          maskImage: "radial-gradient(ellipse 90% 70% at 50% 30%, black 30%, transparent 75%)",
          WebkitMaskImage: "radial-gradient(ellipse 90% 70% at 50% 30%, black 30%, transparent 75%)",
        }}
      />

      {/* noise tipis agar tidak terlihat flat */}
      <div
        className="absolute inset-0 opacity-[0.025] mix-blend-overlay"
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='140' height='140'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")",
        }}
      />
    </div>
  );
}
