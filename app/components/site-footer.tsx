import { ArrowUpRight, Camera, Phone } from "lucide-react";
import Link from "next/link";
import { BrandLockup } from "@/app/components/brand-lockup";

export function SiteFooter() {
  return (
    <footer className="site-footer" id="our-story">
      <div className="footer-main">
        <div className="footer-brand">
          <BrandLockup />
          <p>Thoughtful finds for home, beauty and everywhere in between.</p>
        </div>
        <div className="footer-column">
          <h3>Explore</h3>
          <Link href="/#shop">Shop all</Link>
          <Link href="/#shop">Home comforts</Link>
          <Link href="/#shop">Bags &amp; everyday</Link>
          <Link href="/#our-story">Our story</Link>
        </div>
        <div className="footer-column">
          <h3>We&apos;re here</h3>
          <a href="https://wa.me/2349044489844">Delivery &amp; returns</a>
          <a href="https://wa.me/2348132335274">Get in touch</a>
          <a href="https://instagram.com/pelzessentials" target="_blank" rel="noreferrer">
            Instagram
          </a>
        </div>
        <div className="footer-newsletter">
          <h3>Need a hand?</h3>
          <p>
            Questions about an order or a product? Send us a message and we&apos;ll help you out.
          </p>
          <a className="footer-cta" href="https://wa.me/2349044489844">
            Message us on WhatsApp <ArrowUpRight size={15} />
          </a>
          <a className="footer-contact" href="https://wa.me/2349044489844">
            <Phone size={14} /> +234 904 448 9844
          </a>
          <a className="footer-contact" href="https://wa.me/2348132335274">
            <Phone size={14} /> +234 813 233 5274
          </a>
          <a className="footer-contact" href="https://instagram.com/pelzessentials">
            <Camera size={14} /> @pelzessentials
          </a>
        </div>
      </div>
      <div className="footer-bottom">
        <span>© {new Date().getFullYear()} Pelz Essentials. Beauty &amp; Style.</span>
        <span>Made for softer, more considered days.</span>
      </div>
    </footer>
  );
}
