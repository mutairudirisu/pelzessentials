import Image from "next/image";
import { HeroSlider, type HeroSlide } from "@/app/components/hero-slider";
import { ShopSection } from "@/app/components/shop-section";
import { getCatalog } from "@/lib/catalog-server";

export default async function Home() {
  const products = await getCatalog();
  const moments = ["Plush blankets", "Tote bags", "Gym mats", "Personal essentials"].flatMap(
    (category) => {
      const product = products.find((item) => item.category === category);
      return product ? [product] : [];
    },
  );
  const editorialProduct = products.find((product) => product.category === "Plush blankets");
  const featuredCategories = [
    {
      category: "Plush blankets",
      eyebrow: "Wrap yourself in comfort",
      title: "Cloud-soft days start at home.",
      description: "Plush layers for slow mornings and softer evenings.",
    },
    {
      category: "Tote bags",
      eyebrow: "Take a little ease with you",
      title: "Everyday plans, well carried.",
      description: "Roomy, ready-to-go favorites for wherever the day leads.",
    },
    {
      category: "Gym mats",
      eyebrow: "Make a little space for you",
      title: "Find your flow, your way.",
      description: "Comfortable essentials for your next moment of movement.",
    },
    {
      category: "Personal essentials",
      eyebrow: "Small rituals, lovely days",
      title: "A little care goes a long way.",
      description: "Everyday care and thoughtful details, gathered in one place.",
    },
    {
      category: "Gym bags",
      eyebrow: "From here to your next thing",
      title: "Good things, ready to go.",
      description: "Practical gym companions with room for all your essentials.",
    },
    {
      category: "Dolphin bags",
      eyebrow: "Carry your day with confidence",
      title: "Your next favorite is right here.",
      description: "A considered collection of bags for the everyday and beyond.",
    },
  ];
  const slides: HeroSlide[] = featuredCategories.flatMap((featured) => {
    const product = products.find((item) => item.category === featured.category);
    return product ? [{ ...featured, image: product.image_url, alt: product.name }] : [];
  });

  return (
    <>
      <HeroSlider slides={slides} />
      <nav className="category-strip" aria-label="Shop by category">
        {[
          "Plush blankets",
          "Tote bags",
          "Gym mats",
          "Personal essentials",
          "Gym bags",
          "Dolphin bags",
        ].map((category, index) => (
          <a className="category-link" href="#shop" key={category}>
            <span className="category-index">0{index + 1}</span>
            {category}
          </a>
        ))}
      </nav>
      <ShopSection products={products} />
      <section className="editorial">
        <div className="editorial-frame">
          <div className="editorial-image">
            <Image
              src={editorialProduct?.image_url ?? products[0].image_url}
              alt={editorialProduct?.name ?? "Pelz Essentials product"}
              fill
              sizes="(max-width: 640px) 90vw, 45vw"
            />
          </div>
          <div className="editorial-copy">
            <p className="eyebrow">The everyday, elevated</p>
            <h2>Small comforts. Better days.</h2>
            <p>
              From slow mornings at home to everything you carry out the door, find the pieces that
              make your everyday feel a little more like you.
            </p>
            <a className="button button-outline" href="#shop">
              Find your favorites
            </a>
          </div>
        </div>
      </section>
      <section className="social-section">
        <div className="social-heading">
          <div>
            <p className="eyebrow">A peek into our world</p>
            <h2>Made for your everyday.</h2>
          </div>
          <a href="https://instagram.com/pelzessentials" target="_blank" rel="noreferrer">
            @pelzessentials ↗
          </a>
        </div>
        <div className="social-grid">
          {moments.map((product) => (
            <div className="social-image" key={product.id}>
              <Image
                src={product.image_url}
                alt={product.name}
                fill
                sizes="(max-width: 640px) 43vw, 22vw"
              />
            </div>
          ))}
        </div>
      </section>
      <section className="app-download" aria-labelledby="app-download-title">
        <p className="eyebrow">Pelz, wherever you go</p>
        <h2 id="app-download-title">Take your favorites with you.</h2>
        <p>Download our Android app and keep your bag in sync across devices.</p>
        <a
          className="button app-download-button"
          href="/downloads/Pelz-Essentials-Android.apk"
          download
        >
          <Image
            src="/pelzlogo.png"
            alt=""
            width={22}
            height={22}
            className="app-download-icon"
          />
          Download the Android app
        </a>
        <span className="app-download-note">Android APK · 29 MB</span>
      </section>
    </>
  );
}
