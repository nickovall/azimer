const srcByTone: Record<string, string> = {
  light: "/logo-light.svg",
  dark: "/logo-dark.svg",
  white: "/logo-white.svg",
};

export default function Logo({
  className = "h-12 w-auto",
  tone = "dark",
}: {
  className?: string;
  tone?: "light" | "dark" | "white";
}) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={srcByTone[tone]} alt="АЗИМЕР" className={className} />
  );
}
