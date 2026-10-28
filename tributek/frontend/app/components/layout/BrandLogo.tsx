/**
 * Interfaz BrandLogo. Las funciones de este archivo separan la presentación de sus acciones y estados; los comentarios siguientes describen cada responsabilidad.
 */
import Image from "next/image";

type BrandLogoProps = {
  alt?: string;
  width: number;
  height: number;
  className?: string;
  priority?: boolean;
};

/** Elige la imagen del logo según el tema claro u oscuro. */
export default function BrandLogo({
  alt = "TRIBUTEK",
  width,
  height,
  className = "",
  priority = false,
}: BrandLogoProps) {
  return (
    <>
      <Image
        src="/images/tras-TRIBUTEK.svg"
        alt={alt}
        width={width}
        height={height}
        priority={priority}
        className={`dark:hidden ${className}`}
      />
      <Image
        src="/images/tras-TRIBUTEK-dark.svg"
        alt=""
        aria-hidden="true"
        width={width}
        height={height}
        priority={priority}
        className={`hidden dark:block ${className}`}
      />
    </>
  );
}
