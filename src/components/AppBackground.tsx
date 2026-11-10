/** Latar belakang polos: warna dasar + titik halus yang memudar ke tepi. */
export function AppBackground() {
  return (
    <div aria-hidden className="fixed inset-0 -z-10 bg-background">
      <div
        className="absolute inset-0"
        style={{
          backgroundImage: "radial-gradient(var(--dot) 1px, transparent 1px)",
          backgroundSize: "26px 26px",
          maskImage: "radial-gradient(ellipse 85% 65% at 50% 30%, black 20%, transparent 78%)",
          WebkitMaskImage: "radial-gradient(ellipse 85% 65% at 50% 30%, black 20%, transparent 78%)",
        }}
      />
    </div>
  );
}
