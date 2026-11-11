/** Latar belakang polos: warna dasar + pola titik halus yang memudar. */
export function AppBackground() {
  return (
    <div aria-hidden className="fixed inset-0 -z-10 bg-background">
      <div
        className="absolute inset-0"
        style={{
          backgroundImage: "radial-gradient(var(--dot) 1px, transparent 1px)",
          backgroundSize: "30px 30px",
          maskImage: "radial-gradient(ellipse 90% 70% at 50% 20%, black 25%, transparent 80%)",
          WebkitMaskImage: "radial-gradient(ellipse 90% 70% at 50% 20%, black 25%, transparent 80%)",
        }}
      />
    </div>
  );
}
