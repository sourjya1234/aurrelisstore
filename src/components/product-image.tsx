import Image, { type ImageProps } from "next/image";

/** next/image that skips optimisation for SVG placeholders (used by the mock catalog). */
export function ProductImage(props: ImageProps & { src: string }) {
  return <Image {...props} unoptimized={props.src.endsWith(".svg")} alt={props.alt} />;
}
