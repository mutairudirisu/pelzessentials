import Image from "next/image";
import Link from "next/link";

export function BrandLockup() {
  return (
    <Link className="wordmark" href="/" aria-label="Pelz Essentials home">
      <Image src="/pelzlogo.png" alt="" width={128} height={128} className="wordmark-logo" />
      <span className="wordmark-name">
        <strong>PELZ ESSENTIALS</strong>
        <small>Beauty &amp; Style</small>
      </span>
    </Link>
  );
}
