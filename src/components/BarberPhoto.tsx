import { useEffect, useState, type CSSProperties } from "react";

interface BarberPhotoProps {
  photos: string[];
  alt: string;
  className?: string;
  style?: CSSProperties;
}

/** Cycles through a barber's gallery photos every few seconds with a soft crossfade. */
export function BarberPhoto({ photos, alt, className, style }: BarberPhotoProps) {
  const [index, setIndex] = useState(0);
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    if (photos.length < 2) return;
    const timer = setInterval(() => {
      setVisible(false);
      setTimeout(() => {
        setIndex((i) => (i + 1) % photos.length);
        setVisible(true);
      }, 320);
    }, 4200);
    return () => clearInterval(timer);
  }, [photos.length]);

  return (
    <img
      src={photos[index] ?? ""}
      alt={alt}
      loading="lazy"
      className={className}
      style={{ ...style, opacity: visible ? 1 : 0, transition: "opacity 500ms ease" }}
    />
  );
}
