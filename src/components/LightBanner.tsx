export function LightBanner() {
  return (
    <section className="bg-ink px-6 pt-6">
      <div className="relative mt-10 h-[clamp(260px,42vh,420px)] border-y border-border">
        <div
          aria-hidden
          className="absolute inset-0"
          style={{
            backgroundImage: "url('/img/salao-05.jpg')",
            backgroundSize: "cover",
            backgroundPosition: "center center",
            backgroundAttachment: "fixed",
            backgroundRepeat: "no-repeat",
          }}
        />
        <div className="absolute inset-0 flex items-center justify-center bg-ink/62 px-6">
          <p className="m-0 text-center font-heading text-[clamp(20px,3vw,38px)] font-medium tracking-[0.2em] text-white uppercase">
            Luz certa. Corte certo.
          </p>
        </div>
      </div>
    </section>
  );
}
