import type { Metadata } from "next";
import { CartDrawer } from "@/app/components/cart-drawer";
import { SiteFooter } from "@/app/components/site-footer";
import { SiteHeader } from "@/app/components/site-header";
import { ShopProvider } from "@/app/components/shop-provider";
import { getCatalog } from "@/lib/catalog-server";
import "./globals.css";

export const metadata: Metadata = {
  title: "Pelz Essentials | Home, beauty & everyday style",
  description: "Thoughtful home comforts and everyday essentials, selected by Pelz Essentials.",
};

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const products = await getCatalog();

  return (
    <html lang="en" data-scroll-behavior="smooth">
      <body>
        <ShopProvider products={products}>
          <div className="announcement-bar">
            <span>Comfort, collected.</span>
            <span>Thoughtful finds for home and everywhere</span>
            <a href="https://wa.me/2349044489844">Questions? Chat with us</a>
          </div>
          <SiteHeader />
          <main>{children}</main>
          <SiteFooter />
          <CartDrawer />
        </ShopProvider>
      </body>
    </html>
  );
}
