import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Image,
  ImageBackground,
  type ImageSourcePropType,
  Modal,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { StatusBar } from "expo-status-bar";
import * as ExpoLinking from "expo-linking";
import * as WebBrowser from "expo-web-browser";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "./src/supabase";

WebBrowser.maybeCompleteAuthSession();

type Product = {
  id: string;
  name: string;
  category: string;
  description: string;
  price: number;
  image_url: string;
  badge: string;
};
type CartRow = { product_id: string; quantity: number };
type CartLine = { product: Product; quantity: number };
type Screen = "shop" | "saved" | "bag" | "account";

const siteUrl = process.env.EXPO_PUBLIC_SITE_URL?.replace(/\/$/, "");

const bundledProductImages: Record<string, ImageSourcePropType> = {
  "cloud-plush-blanket": require("./assets/products/cloud-plush-blanket.jpg"),
  "weekend-fleece-throw": require("./assets/products/weekend-fleece-throw.jpg"),
  "rose-garden-blanket": require("./assets/products/rose-garden-blanket.jpg"),
  "sage-cloud-blanket": require("./assets/products/sage-cloud-blanket.jpg"),
  "everyday-tote": require("./assets/products/everyday-tote.jpg"),
  "market-day-canvas": require("./assets/products/market-day-canvas.jpg"),
  "woven-weekend-tote": require("./assets/products/woven-weekend-tote.jpg"),
  "little-day-tote": require("./assets/products/little-day-tote.jpg"),
  "studio-gym-mat": require("./assets/products/studio-gym-mat.jpg"),
  "daily-flow-mat": require("./assets/products/daily-flow-mat.jpg"),
  "cork-balance-mat": require("./assets/products/cork-balance-mat.jpg"),
  "fold-and-go-mat": require("./assets/products/fold-and-go-mat.jpg"),
  "daily-essentials-set": require("./assets/products/daily-essentials-set.jpg"),
  "glow-ritual-kit": require("./assets/products/glow-ritual-kit.jpg"),
  "fresh-start-care-set": require("./assets/products/fresh-start-care-set.jpg"),
  "little-travel-essentials": require("./assets/products/little-travel-essentials.jpg"),
  "active-day-duffel": require("./assets/products/active-day-duffel.jpg"),
  "move-light-backpack": require("./assets/products/move-light-backpack.jpg"),
  "after-class-weekender": require("./assets/products/after-class-weekender.jpg"),
  "quick-reset-sling": require("./assets/products/quick-reset-sling.jpg"),
  "dolphin-weekender": require("./assets/products/dolphin-weekender.jpg"),
  "dolphin-city-tote": require("./assets/products/dolphin-city-tote.jpg"),
  "dolphin-travel-carryall": require("./assets/products/dolphin-travel-carryall.jpg"),
  "dolphin-mini-crossbody": require("./assets/products/dolphin-mini-crossbody.jpg"),
};

function formatNaira(amount: number) {
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    maximumFractionDigits: 0,
  }).format(amount);
}

function imageUrl(path: string): string | null {
  if (/^https?:\/\//i.test(path)) return path;
  return siteUrl ? `${siteUrl}${path.startsWith("/") ? path : `/${path}`}` : null;
}

function productImage(product: Product): ImageSourcePropType | undefined {
  const bundledImage = bundledProductImages[product.id];
  if (bundledImage) return bundledImage;
  const url = imageUrl(product.image_url);
  return url ? { uri: url } : undefined;
}

export default function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [accountCartId, setAccountCartId] = useState<string | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [cartRows, setCartRows] = useState<CartRow[]>([]);
  const [screen, setScreen] = useState<Screen>("shop");
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [search, setSearch] = useState("");
  const [savedProducts, setSavedProducts] = useState<string[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const oauthExchanges = useRef(new Map<string, Promise<Session>>()).current;
  const callbackFailure = useRef<string | null>(null);

  const handleOAuthCallback = useCallback(
    async (callbackUrl: string): Promise<Session | null> => {
      const callback = new URL(callbackUrl);
      const expectedCallback = new URL(ExpoLinking.createURL("auth/callback"));
      if (
        callback.protocol !== expectedCallback.protocol ||
        callback.hostname !== expectedCallback.hostname ||
        callback.port !== expectedCallback.port ||
        callback.pathname !== expectedCallback.pathname
      ) {
        return null;
      }

      const callbackParams = new URLSearchParams(callback.search);
      const callbackHash = new URLSearchParams(callback.hash.slice(1));
      const callbackError =
        callbackParams.get("error_description") ??
        callbackHash.get("error_description") ??
        callbackParams.get("error") ??
        callbackHash.get("error");
      if (callbackError) throw new Error(callbackError);

      const code = callbackParams.get("code") ?? callbackHash.get("code");
      if (!code) throw new Error("Google returned to the app without an authorization code.");

      let exchange = oauthExchanges.get(code);
      if (!exchange) {
        exchange = (async () => {
          const { data, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
          if (exchangeError) throw exchangeError;
          if (!data.session) {
            throw new Error(
              "Supabase accepted the Google callback but did not return a session. Check the Google provider configuration in Supabase Auth.",
            );
          }
          return data.session;
        })();
        oauthExchanges.set(code, exchange);
      }

      return exchange;
    },
    [oauthExchanges],
  );

  useEffect(() => {
    let active = true;
    supabase.auth.getSession().then(({ data, error: sessionError }) => {
      if (!active) return;
      if (sessionError) setError(sessionError.message);
      setSession(data.session);
    });
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      setAccountCartId(null);
      setCartRows([]);
      setError("");
    });
    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    let active = true;
    const handleIncomingUrl = async (url: string) => {
      try {
        const callbackSession = await handleOAuthCallback(url);
        if (active && callbackSession) {
          setSession(callbackSession);
          setError("");
        }
      } catch (callbackError) {
        if (active) {
          callbackFailure.current =
            callbackError instanceof Error ? callbackError.message : "Unknown callback error.";
          setError(`Google sign-in callback failed: ${callbackFailure.current}`);
        }
      }
    };

    const subscription = Linking.addEventListener("url", ({ url }) => {
      void handleIncomingUrl(url);
    });
    void Linking.getInitialURL()
      .then((url) => {
        if (url) void handleIncomingUrl(url);
      })
      .catch((callbackError: Error) => {
        if (active) setError(`Could not read the app's sign-in callback: ${callbackError.message}`);
      });

    return () => {
      active = false;
      subscription.remove();
    };
  }, [handleOAuthCallback]);

  useEffect(() => {
    let active = true;
    async function loadProducts() {
      setLoadingProducts(true);
      const { data, error: catalogError } = await supabase
        .from("products")
        .select("id,name,category,description,price,image_url,badge")
        .eq("active", true)
        .order("sort_order");
      if (!active) return;
      if (catalogError) setError(catalogError.message);
      else setProducts(data ?? []);
      setLoadingProducts(false);
    }
    void loadProducts();
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    const userId = session?.user.id;
    if (!userId) return;
    let active = true;
    async function loadAccountCart() {
      const { data, error: cartError } = await supabase
        .from("carts")
        .upsert({ user_id: userId }, { onConflict: "user_id" })
        .select("id")
        .single();
      if (cartError) throw cartError;
      if (active) setAccountCartId(data.id);
    }
    void loadAccountCart().catch((cartError: Error) => {
      if (active) setError(`Your account bag could not be initialized: ${cartError.message}`);
    });
    return () => {
      active = false;
    };
  }, [session?.user.id]);

  useEffect(() => {
    const userId = session?.user.id;
    if (!userId || !accountCartId) return;
    let active = true;
    async function refreshCart() {
      const { data, error: cartError } = await supabase
        .from("cart_items")
        .select("product_id,quantity")
        .eq("cart_id", accountCartId)
        .gt("quantity", 0);
      if (cartError) throw cartError;
      if (active) setCartRows(data ?? []);
    }
    const channel = supabase
      .channel(`mobile-cart-${userId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "cart_items",
          filter: `cart_id=eq.${accountCartId}`,
        },
        () => {
          void refreshCart().catch((cartError: Error) => {
            if (active) setError(`Your synced bag could not be refreshed: ${cartError.message}`);
          });
        },
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "carts", filter: `user_id=eq.${userId}` },
        () => {
          void refreshCart().catch((cartError: Error) => {
            if (active) setError(`Your synced bag could not be refreshed: ${cartError.message}`);
          });
        },
      )
      .subscribe((status) => {
        if (status === "SUBSCRIBED") {
          void refreshCart().catch((cartError: Error) => {
            if (active) setError(`Your bag could not be loaded: ${cartError.message}`);
          });
        } else if (active && (status === "CHANNEL_ERROR" || status === "TIMED_OUT")) {
          setError("Live bag sync disconnected. Please check your connection.");
        }
      });
    return () => {
      active = false;
      void supabase.removeChannel(channel);
    };
  }, [accountCartId, session?.user.id]);

  const lines = useMemo<CartLine[]>(
    () =>
      cartRows.flatMap((row) => {
        const product = products.find((item) => item.id === row.product_id);
        return product ? [{ product, quantity: row.quantity }] : [];
      }),
    [cartRows, products],
  );
  const itemCount = lines.reduce((sum, line) => sum + line.quantity, 0);
  const subtotal = lines.reduce((sum, line) => sum + line.product.price * line.quantity, 0);
  const deliveryFee = subtotal === 0 || subtotal >= 100000 ? 0 : 3500;
  const categories = useMemo(
    () => ["All", ...new Set(products.map((product) => product.category))],
    [products],
  );
  const visibleProducts = useMemo(() => {
    const query = search.trim().toLowerCase();
    return products.filter((product) => {
      const matchesCategory = selectedCategory === "All" || product.category === selectedCategory;
      const matchesSearch =
        !query ||
        `${product.name} ${product.category} ${product.description}`.toLowerCase().includes(query);
      return (
        matchesCategory &&
        matchesSearch &&
        (screen !== "saved" || savedProducts.includes(product.id))
      );
    });
  }, [products, savedProducts, screen, search, selectedCategory]);

  async function signInWithGoogle() {
    setBusy(true);
    setError("");
    callbackFailure.current = null;
    try {
      const redirectTo = ExpoLinking.createURL("auth/callback");
      const { data, error: oauthError } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo, skipBrowserRedirect: true },
      });
      if (oauthError) throw oauthError;
      if (!data.url) throw new Error("Supabase did not return a Google sign-in URL.");

      const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);
      let callbackSession: Session | null = null;
      if (result.type === "success") {
        callbackSession = await handleOAuthCallback(result.url);
        if (!callbackSession) {
          throw new Error(
            `Google returned to ${new URL(result.url).origin} instead of the app. In Supabase > Authentication > URL Configuration > Redirect URLs, add this exact Expo callback: ${redirectTo}`,
          );
        }
      } else if (result.type === "cancel" || result.type === "dismiss") {
        const deadline = Date.now() + 15000;
        while (!callbackSession && Date.now() < deadline) {
          if (callbackFailure.current) throw new Error(callbackFailure.current);
          const { data: currentSession, error: sessionError } = await supabase.auth.getSession();
          if (sessionError) throw sessionError;
          callbackSession = currentSession.session;
          if (!callbackSession) await new Promise((resolve) => setTimeout(resolve, 250));
        }
        if (!callbackSession) {
          throw new Error(
            `Google sign-in closed without creating a session. Confirm Supabase allows this callback: ${redirectTo}. If Expo Go also says it cannot connect to Expo CLI, restart Metro with npx expo start --tunnel and scan the new QR code.`,
          );
        }
      } else {
        throw new Error("Google sign-in was dismissed before returning to Pelz Essentials.");
      }

      callbackFailure.current = null;
      setSession(callbackSession);
    } catch (signInError) {
      setError(signInError instanceof Error ? signInError.message : "Google sign-in failed.");
    } finally {
      setBusy(false);
    }
  }

  async function changeQuantity(productId: string, quantity: number) {
    if (!session) {
      setError("Sign in with Google to sync your bag across devices.");
      return;
    }
    if (!accountCartId) {
      setError("Your account bag is still loading. Please try again.");
      return;
    }
    const previousRows = cartRows;
    const nextRows =
      quantity < 1
        ? cartRows.filter((row) => row.product_id !== productId)
        : cartRows.some((row) => row.product_id === productId)
          ? cartRows.map((row) =>
              row.product_id === productId ? { ...row, quantity: Math.min(20, quantity) } : row,
            )
          : [...cartRows, { product_id: productId, quantity: 1 }];
    setCartRows(nextRows);
    setError("");
    const result =
      quantity < 1
        ? await supabase
            .from("cart_items")
            .update({ quantity: 0 })
            .eq("cart_id", accountCartId)
            .eq("product_id", productId)
        : await supabase.from("cart_items").upsert(
            {
              cart_id: accountCartId,
              product_id: productId,
              quantity: Math.min(20, quantity),
            },
            { onConflict: "cart_id,product_id" },
          );
    if (result.error) {
      setCartRows(previousRows);
      setError(`Your bag change could not be saved: ${result.error.message}`);
    }
  }

  async function signOut() {
    const { error: signOutError } = await supabase.auth.signOut();
    if (signOutError) setError(`Sign out failed: ${signOutError.message}`);
  }

  async function continueToCheckout() {
    if (!siteUrl) {
      setError("Set EXPO_PUBLIC_SITE_URL in mobile/.env to open website checkout.");
      return;
    }
    try {
      await Linking.openURL(`${siteUrl}/checkout`);
    } catch (linkError) {
      setError(linkError instanceof Error ? linkError.message : "Could not open checkout.");
    }
  }

  function toggleSaved(productId: string) {
    setSavedProducts((current) =>
      current.includes(productId)
        ? current.filter((id) => id !== productId)
        : [...current, productId],
    );
  }

  function productCard({ item }: { item: Product }) {
    const image = productImage(item);
    return (
      <View style={styles.productCard}>
        <Pressable
          onPress={() => setSelectedProduct(item)}
          accessibilityRole="button"
          accessibilityLabel={`View ${item.name} details`}
        >
          {image ? (
            <Image source={image} style={styles.productImage} alt={item.name} />
          ) : (
            <View style={[styles.productImage, styles.imagePlaceholder]}>
              <Text style={styles.muted}>Photo unavailable</Text>
            </View>
          )}
          {item.badge ? (
            <View style={styles.productBadge}>
              <Text style={styles.productBadgeText}>{item.badge}</Text>
            </View>
          ) : null}
        </Pressable>
        <Pressable
          style={styles.favoriteButton}
          onPress={() => toggleSaved(item.id)}
          accessibilityRole="button"
          accessibilityLabel={
            savedProducts.includes(item.id) ? `Unsave ${item.name}` : `Save ${item.name}`
          }
        >
          <Ionicons
            name={savedProducts.includes(item.id) ? "heart" : "heart-outline"}
            size={17}
            color={savedProducts.includes(item.id) ? "#a45b55" : "#55453a"}
          />
        </Pressable>
        <View style={styles.productInfo}>
          <Text style={styles.category}>{item.category}</Text>
          <Text style={styles.productName} numberOfLines={1}>
            {item.name}
          </Text>
          <View style={styles.productFooter}>
            <Text style={styles.price}>{formatNaira(item.price)}</Text>
            <Pressable
              style={styles.addButton}
              onPress={() =>
                void changeQuantity(
                  item.id,
                  (cartRows.find((row) => row.product_id === item.id)?.quantity ?? 0) + 1,
                )
              }
              accessibilityLabel={`Add ${item.name} to bag`}
            >
              <Ionicons name="add" size={17} color="#614a38" />
            </Pressable>
          </View>
        </View>
      </View>
    );
  }

  function renderShopHeader() {
    const featured = products[0];
    const featuredImage = featured ? productImage(featured) : undefined;
    return (
      <View>
        <View style={styles.searchBox}>
          <Ionicons name="search-outline" size={19} color="#8b8176" />
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder="Search for something lovely"
            placeholderTextColor="#9a9188"
            style={styles.searchInput}
            returnKeyType="search"
            accessibilityLabel="Search products"
          />
          {search.length > 0 && (
            <Pressable onPress={() => setSearch("")} accessibilityLabel="Clear search">
              <Ionicons name="close-circle" size={18} color="#8b8176" />
            </Pressable>
          )}
        </View>
        <View style={styles.sectionHeading}>
          <View>
            <Text style={styles.eyebrow}>THOUGHTFUL FINDS FOR EVERY DAY</Text>
            <Text style={styles.heading}>A little lovely.</Text>
          </View>
          <Ionicons name="sparkles-outline" size={22} color="#a88654" />
        </View>
        {featured && featuredImage && (
          <ImageBackground
            source={featuredImage}
            style={styles.featuredCard}
            imageStyle={styles.featuredImage}
          >
            <View style={styles.featuredShade} />
            <View style={styles.featuredCopy}>
              <Text style={styles.featuredEyebrow}>THE EVERYDAY EDIT</Text>
              <Text style={styles.featuredTitle}>Comfort, collected.</Text>
              <Text style={styles.featuredDescription}>
                Little things that make home feel more like you.
              </Text>
              <Pressable style={styles.featuredButton} onPress={() => setSelectedProduct(featured)}>
                <Text style={styles.featuredButtonText}>Discover the edit</Text>
                <Ionicons name="arrow-forward" size={15} color="#49382c" />
              </Pressable>
            </View>
          </ImageBackground>
        )}
        <View style={styles.sectionHeader}>
          <View>
            <Text style={styles.sectionTitle}>Shop by mood</Text>
            <Text style={styles.sectionCaption}>A good place to begin</Text>
          </View>
        </View>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.categoryList}
        >
          {categories.map((category) => {
            const active = selectedCategory === category;
            return (
              <Pressable
                key={category}
                style={[styles.categoryChip, active && styles.categoryChipActive]}
                onPress={() => setSelectedCategory(category)}
                accessibilityRole="button"
                accessibilityState={{ selected: active }}
              >
                <Text style={[styles.categoryChipText, active && styles.categoryChipTextActive]}>
                  {category}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
        <View style={styles.sectionHeader}>
          <View>
            <Text style={styles.sectionTitle}>
              {screen === "saved" ? "Your saved pieces" : "Curated for you"}
            </Text>
            <Text style={styles.sectionCaption}>Pieces to make your everyday softer</Text>
          </View>
          <Text style={styles.resultCount}>{visibleProducts.length} pieces</Text>
        </View>
      </View>
    );
  }

  return (
    <SafeAreaProvider style={styles.root}>
      <SafeAreaView style={styles.safeArea}>
        <StatusBar style="dark" />
        <View style={styles.header}>
          <View style={styles.brandLockup}>
            <Image source={require("./assets/pelzlogo.png")} style={styles.brandLogo} />
            <View>
              <Text style={styles.brand}>PELZ ESSENTIALS</Text>
              <Text style={styles.tagline}>Beauty &amp; Style</Text>
            </View>
          </View>
          {session ? (
            <Pressable onPress={() => void signOut()} style={styles.accountButton}>
              <Text style={styles.accountButtonText}>Sign out</Text>
            </Pressable>
          ) : (
            <Pressable
              onPress={() => void signInWithGoogle()}
              disabled={busy}
              style={styles.accountButton}
            >
              <Text style={styles.accountButtonText}>{busy ? "Opening…" : "Sign in"}</Text>
            </Pressable>
          )}
        </View>
        {error ? (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{error}</Text>
            <Pressable onPress={() => setError("")}>
              <Text style={styles.dismissText}>Dismiss</Text>
            </Pressable>
          </View>
        ) : null}
        <View style={styles.screenContent}>
          {screen === "shop" || screen === "saved" ? (
            loadingProducts ? (
              <ActivityIndicator style={styles.loading} color="#6e513e" />
            ) : (
              <FlatList
                data={visibleProducts}
                renderItem={productCard}
                keyExtractor={(item) => item.id}
                numColumns={2}
                columnWrapperStyle={styles.productRow}
                contentContainerStyle={styles.catalog}
                ListHeaderComponent={renderShopHeader}
                ListEmptyComponent={
                  <View style={styles.emptyCatalog}>
                    <Ionicons
                      name={screen === "saved" ? "heart-outline" : "search-outline"}
                      size={28}
                      color="#9b826c"
                    />
                    <Text style={styles.emptyTitle}>
                      {screen === "saved" ? "No saved pieces yet" : "Nothing found just yet"}
                    </Text>
                    <Text style={styles.description}>
                      {screen === "saved"
                        ? "Tap the heart on a product to keep it close."
                        : "Try another search or category."}
                    </Text>
                  </View>
                }
              />
            )
          ) : screen === "bag" ? (
            <ScrollView contentContainerStyle={styles.bagContent}>
              <Text style={styles.heading}>Your bag</Text>
              {!session ? (
                <View style={styles.emptyBag}>
                  <Text style={styles.emptyTitle}>Sign in to see your bag</Text>
                  <Text style={styles.description}>
                    Use the same Google account on the website and app. Cart changes sync in real
                    time.
                  </Text>
                  <Pressable
                    style={styles.primaryButton}
                    onPress={() => void signInWithGoogle()}
                    disabled={busy}
                  >
                    <Text style={styles.primaryButtonText}>
                      {busy ? "Opening Google…" : "Continue with Google"}
                    </Text>
                  </Pressable>
                </View>
              ) : lines.length === 0 ? (
                <View style={styles.emptyBag}>
                  <Text style={styles.emptyTitle}>Your bag is waiting.</Text>
                  <Text style={styles.description}>Add something lovely from the shop.</Text>
                </View>
              ) : (
                <>
                  {lines.map(({ product, quantity }) => {
                    const image = productImage(product);
                    return (
                      <View style={styles.cartLine} key={product.id}>
                        {image ? (
                          <Image source={image} style={styles.cartImage} alt={product.name} />
                        ) : null}
                        <View style={styles.cartDetails}>
                          <Text style={styles.productName}>{product.name}</Text>
                          <Text style={styles.price}>{formatNaira(product.price)}</Text>
                          <View style={styles.quantityRow}>
                            <Pressable
                              style={styles.quantityButton}
                              onPress={() => void changeQuantity(product.id, quantity - 1)}
                            >
                              <Text style={styles.quantityText}>−</Text>
                            </Pressable>
                            <Text style={styles.quantityText}>{quantity}</Text>
                            <Pressable
                              style={styles.quantityButton}
                              onPress={() => void changeQuantity(product.id, quantity + 1)}
                            >
                              <Text style={styles.quantityText}>+</Text>
                            </Pressable>
                          </View>
                        </View>
                        <Text style={styles.price}>{formatNaira(product.price * quantity)}</Text>
                      </View>
                    );
                  })}
                  <View style={styles.summary}>
                    <View style={styles.summaryLine}>
                      <Text style={styles.description}>Subtotal</Text>
                      <Text style={styles.price}>{formatNaira(subtotal)}</Text>
                    </View>
                    <View style={styles.summaryLine}>
                      <Text style={styles.description}>Delivery</Text>
                      <Text style={styles.price}>
                        {deliveryFee ? formatNaira(deliveryFee) : "Complimentary"}
                      </Text>
                    </View>
                    <View style={styles.summaryLine}>
                      <Text style={styles.totalLabel}>Total</Text>
                      <Text style={styles.totalLabel}>{formatNaira(subtotal + deliveryFee)}</Text>
                    </View>
                    <Pressable
                      style={styles.primaryButton}
                      onPress={() => void continueToCheckout()}
                    >
                      <Text style={styles.primaryButtonText}>Continue to website checkout</Text>
                    </Pressable>
                  </View>
                </>
              )}
            </ScrollView>
          ) : (
            <ScrollView contentContainerStyle={styles.accountContent}>
              <View style={styles.accountIntro}>
                <Text style={styles.eyebrow}>YOUR PELZ ACCOUNT</Text>
                <Text style={styles.heading}>A little more personal.</Text>
                <Text style={styles.description}>
                  Your profile keeps your shopping experience connected across devices.
                </Text>
              </View>
              <View style={styles.accountCard}>
                <View style={styles.accountAvatar}>
                  <Ionicons name="person-outline" size={26} color="#705941" />
                </View>
                <Text style={styles.accountName}>
                  {session?.user.user_metadata.full_name ??
                    session?.user.user_metadata.name ??
                    "Welcome to Pelz"}
                </Text>
                <Text style={styles.accountEmail}>
                  {session?.user.email ?? "Sign in to access your account"}
                </Text>
                {session ? (
                  <Pressable style={styles.accountAction} onPress={() => void signOut()}>
                    <Ionicons name="log-out-outline" size={18} color="#765b46" />
                    <Text style={styles.accountActionText}>Sign out</Text>
                  </Pressable>
                ) : (
                  <Pressable
                    style={styles.primaryButton}
                    onPress={() => void signInWithGoogle()}
                    disabled={busy}
                  >
                    <Text style={styles.primaryButtonText}>
                      {busy ? "Opening Google…" : "Continue with Google"}
                    </Text>
                  </Pressable>
                )}
              </View>
              <Pressable style={styles.accountLink} onPress={() => setScreen("saved")}>
                <View style={styles.accountLinkIcon}>
                  <Ionicons name="heart-outline" size={19} color="#765b46" />
                </View>
                <View style={styles.accountLinkCopy}>
                  <Text style={styles.accountLinkTitle}>Saved pieces</Text>
                  <Text style={styles.accountLinkCaption}>
                    {savedProducts.length} lovely finds saved for later
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color="#9a8a7b" />
              </Pressable>
              <Pressable style={styles.accountLink} onPress={() => setScreen("bag")}>
                <View style={styles.accountLinkIcon}>
                  <Ionicons name="bag-handle-outline" size={19} color="#765b46" />
                </View>
                <View style={styles.accountLinkCopy}>
                  <Text style={styles.accountLinkTitle}>Your shopping bag</Text>
                  <Text style={styles.accountLinkCaption}>
                    {itemCount} {itemCount === 1 ? "piece" : "pieces"} in your bag
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color="#9a8a7b" />
              </Pressable>
            </ScrollView>
          )}
        </View>
        <View style={styles.tabBar} accessibilityRole="tablist">
          <Pressable
            style={styles.tabButton}
            onPress={() => setScreen("shop")}
            accessibilityRole="tab"
            accessibilityLabel="Shop"
            accessibilityState={{ selected: screen === "shop" }}
          >
            <Ionicons
              name={screen === "shop" ? "storefront" : "storefront-outline"}
              size={22}
              color={screen === "shop" ? "#614a38" : "#8b8176"}
            />
            <Text style={[styles.tabLabel, screen === "shop" && styles.activeTabLabel]}>Shop</Text>
          </Pressable>
          <Pressable
            style={styles.tabButton}
            onPress={() => setScreen("saved")}
            accessibilityRole="tab"
            accessibilityLabel={`Saved pieces, ${savedProducts.length} items`}
            accessibilityState={{ selected: screen === "saved" }}
          >
            <Ionicons
              name={screen === "saved" ? "heart" : "heart-outline"}
              size={22}
              color={screen === "saved" ? "#614a38" : "#8b8176"}
            />
            <Text style={[styles.tabLabel, screen === "saved" && styles.activeTabLabel]}>
              Saved
            </Text>
          </Pressable>
          <Pressable
            style={styles.tabButton}
            onPress={() => setScreen("bag")}
            accessibilityRole="tab"
            accessibilityLabel={`Bag, ${itemCount} items`}
            accessibilityState={{ selected: screen === "bag" }}
          >
            <View>
              <Ionicons
                name={screen === "bag" ? "bag-handle" : "bag-handle-outline"}
                size={22}
                color={screen === "bag" ? "#614a38" : "#8b8176"}
              />
              {itemCount > 0 && (
                <View style={styles.tabBadge}>
                  <Text style={styles.tabBadgeText}>{itemCount > 99 ? "99+" : itemCount}</Text>
                </View>
              )}
            </View>
            <Text style={[styles.tabLabel, screen === "bag" && styles.activeTabLabel]}>Bag</Text>
          </Pressable>
          <Pressable
            style={styles.tabButton}
            onPress={() => setScreen("account")}
            accessibilityRole="tab"
            accessibilityLabel="Account"
            accessibilityState={{ selected: screen === "account" }}
          >
            <Ionicons
              name={screen === "account" ? "person" : "person-outline"}
              size={22}
              color={screen === "account" ? "#614a38" : "#8b8176"}
            />
            <Text style={[styles.tabLabel, screen === "account" && styles.activeTabLabel]}>
              Account
            </Text>
          </Pressable>
        </View>
        <Modal
          visible={selectedProduct !== null}
          animationType="slide"
          presentationStyle="pageSheet"
          onRequestClose={() => setSelectedProduct(null)}
        >
          {selectedProduct && (
            <SafeAreaView style={styles.detailPage}>
              <View style={styles.detailTopBar}>
                <Pressable
                  style={styles.detailIconButton}
                  onPress={() => setSelectedProduct(null)}
                  accessibilityLabel="Close product details"
                >
                  <Ionicons name="arrow-back" size={20} color="#3e332b" />
                </Pressable>
                <Text style={styles.detailTopTitle}>A little lovely</Text>
                <Pressable
                  style={styles.detailIconButton}
                  onPress={() => toggleSaved(selectedProduct.id)}
                  accessibilityLabel={
                    savedProducts.includes(selectedProduct.id)
                      ? "Remove from saved items"
                      : "Save item"
                  }
                >
                  <Ionicons
                    name={savedProducts.includes(selectedProduct.id) ? "heart" : "heart-outline"}
                    size={20}
                    color={savedProducts.includes(selectedProduct.id) ? "#a45b55" : "#3e332b"}
                  />
                </Pressable>
              </View>
              <ScrollView contentContainerStyle={styles.detailScroll}>
                {productImage(selectedProduct) ? (
                  <Image
                    source={productImage(selectedProduct)}
                    style={styles.detailImage}
                    alt={selectedProduct.name}
                  />
                ) : null}
                <View style={styles.detailCopy}>
                  <Text style={styles.eyebrow}>{selectedProduct.category}</Text>
                  <Text style={styles.detailTitle}>{selectedProduct.name}</Text>
                  <Text style={styles.detailPrice}>{formatNaira(selectedProduct.price)}</Text>
                  <View style={styles.detailDivider} />
                  <Text style={styles.detailSectionTitle}>The little details</Text>
                  <Text style={styles.detailDescription}>{selectedProduct.description}</Text>
                  <Text style={styles.detailNote}>
                    Thoughtfully selected by Pelz Essentials to bring a little more comfort to your
                    everyday.
                  </Text>
                </View>
              </ScrollView>
              <View style={styles.detailActions}>
                <Pressable
                  style={styles.detailAddButton}
                  onPress={() => {
                    void changeQuantity(
                      selectedProduct.id,
                      (cartRows.find((row) => row.product_id === selectedProduct.id)?.quantity ??
                        0) + 1,
                    );
                    setSelectedProduct(null);
                  }}
                >
                  <Ionicons name="bag-handle-outline" size={18} color="#fff" />
                  <Text style={styles.detailAddButtonText}>Add to bag</Text>
                  <Text style={styles.detailAddButtonText}>
                    {formatNaira(selectedProduct.price)}
                  </Text>
                </Pressable>
              </View>
            </SafeAreaView>
          )}
        </Modal>
      </SafeAreaView>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  safeArea: { flex: 1, backgroundColor: "#fbf9f5" },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderColor: "#e8e0d6",
  },
  brandLockup: { flexDirection: "row", alignItems: "center", gap: 10 },
  brandLogo: { width: 42, height: 42 },
  brand: { color: "#533f32", fontSize: 15, fontWeight: "700", letterSpacing: 2 },
  tagline: { color: "#8d7a69", fontSize: 12, marginTop: 3 },
  accountButton: {
    borderWidth: 1,
    borderColor: "#d5c7b8",
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 20,
  },
  accountButtonText: { color: "#594332", fontSize: 13, fontWeight: "600" },
  screenContent: { flex: 1 },
  tabBar: {
    flexDirection: "row",
    justifyContent: "space-around",
    borderTopWidth: StyleSheet.hairlineWidth,
    borderColor: "#e4dbd1",
    backgroundColor: "#fff",
    paddingTop: 9,
    paddingBottom: 4,
  },
  tabButton: { flex: 1, alignItems: "center", justifyContent: "center", gap: 3, minHeight: 48 },
  tabLabel: { color: "#8b8176", fontSize: 11, fontWeight: "500" },
  activeTabLabel: { color: "#614a38", fontWeight: "700" },
  tabBadge: {
    position: "absolute",
    top: -5,
    right: -9,
    minWidth: 16,
    height: 16,
    paddingHorizontal: 3,
    borderRadius: 8,
    backgroundColor: "#9a6245",
    alignItems: "center",
    justifyContent: "center",
  },
  tabBadgeText: { color: "#fff", fontSize: 9, fontWeight: "700" },
  searchBox: {
    marginTop: 12,
    marginHorizontal: 16,
    backgroundColor: "#fff",
    borderColor: "#eee8e1",
    borderWidth: 1,
    borderRadius: 10,
    minHeight: 46,
    paddingHorizontal: 13,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  searchInput: { flex: 1, color: "#3f352d", fontSize: 13, paddingVertical: 10 },
  sectionHeading: {
    paddingHorizontal: 20,
    paddingTop: 23,
    paddingBottom: 13,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  featuredCard: {
    height: 180,
    borderRadius: 14,
    overflow: "hidden",
    marginHorizontal: 16,
    justifyContent: "center",
    backgroundColor: "#bda894",
  },
  featuredImage: { borderRadius: 14 },
  featuredShade: {
    position: "absolute",
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    backgroundColor: "rgba(35, 27, 21, 0.42)",
  },
  featuredCopy: { padding: 18, maxWidth: "84%" },
  featuredEyebrow: {
    color: "#fff3e6",
    fontSize: 9,
    fontWeight: "700",
    letterSpacing: 1.6,
  },
  featuredTitle: { color: "#fff", fontSize: 22, fontWeight: "600", marginTop: 7 },
  featuredDescription: { color: "#fff8f0", fontSize: 12, lineHeight: 17, marginTop: 4 },
  featuredButton: {
    alignSelf: "flex-start",
    backgroundColor: "#fffaf4",
    borderRadius: 18,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginTop: 11,
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
  },
  featuredButtonText: { color: "#49382c", fontWeight: "600", fontSize: 11 },
  sectionHeader: {
    paddingHorizontal: 20,
    paddingTop: 22,
    paddingBottom: 9,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
  },
  sectionTitle: { color: "#3c3027", fontSize: 16, fontWeight: "600" },
  sectionCaption: { color: "#918579", fontSize: 11, marginTop: 3 },
  resultCount: { color: "#938578", fontSize: 11, paddingBottom: 2 },
  categoryList: { paddingHorizontal: 16, paddingBottom: 3, gap: 8 },
  categoryChip: {
    paddingHorizontal: 15,
    paddingVertical: 9,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#e9e1d8",
    backgroundColor: "#fff",
  },
  categoryChipActive: { backgroundColor: "#3c352f", borderColor: "#3c352f" },
  categoryChipText: { color: "#756b61", fontSize: 11, fontWeight: "500" },
  categoryChipTextActive: { color: "#fffaf5", fontWeight: "600" },
  errorBox: {
    marginHorizontal: 16,
    marginTop: 12,
    padding: 12,
    backgroundColor: "#f9eae6",
    borderRadius: 8,
  },
  errorText: { color: "#9a392b", fontSize: 13 },
  dismissText: { color: "#71392e", fontWeight: "600", marginTop: 7 },
  loading: { marginTop: 50 },
  catalog: { paddingHorizontal: 14, paddingBottom: 18 },
  eyebrow: {
    color: "#8c705a",
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 1.4,
    textTransform: "uppercase",
  },
  heading: { color: "#352a23", fontSize: 26, fontWeight: "600", marginTop: 8, marginBottom: 8 },
  introCopy: { color: "#796e63", fontSize: 13, lineHeight: 19 },
  productRow: { justifyContent: "space-between" },
  productCard: {
    position: "relative",
    backgroundColor: "#fff",
    borderRadius: 12,
    overflow: "hidden",
    width: "48.4%",
    marginBottom: 13,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "#eee8e1",
  },
  productImage: { width: "100%", height: 174, backgroundColor: "#f0ece6" },
  productBadge: {
    position: "absolute",
    left: 8,
    bottom: 8,
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: "rgba(255, 252, 247, 0.94)",
  },
  productBadgeText: { color: "#705941", fontSize: 9, fontWeight: "600" },
  favoriteButton: {
    position: "absolute",
    top: 8,
    right: 8,
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: "rgba(255,255,255,0.93)",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 1,
  },
  productInfo: { paddingHorizontal: 10, paddingTop: 2, paddingBottom: 10 },
  imagePlaceholder: { alignItems: "center", justifyContent: "center", padding: 8 },
  muted: { color: "#8a8178", fontSize: 11, textAlign: "center" },
  category: {
    color: "#90765e",
    fontSize: 10,
    marginTop: 3,
    textTransform: "uppercase",
    letterSpacing: 0.7,
  },
  productName: { color: "#332922", fontSize: 13, fontWeight: "600", marginTop: 4 },
  description: { color: "#7e746b", fontSize: 12, lineHeight: 17, marginTop: 5 },
  productFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 8,
  },
  price: { color: "#4b3b30", fontSize: 12, fontWeight: "600" },
  addButton: {
    width: 30,
    height: 30,
    backgroundColor: "#eee6dc",
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyCatalog: {
    alignItems: "center",
    paddingVertical: 42,
    paddingHorizontal: 20,
    gap: 7,
  },
  bagContent: { padding: 20, paddingBottom: 24 },
  accountContent: { padding: 20, paddingBottom: 28 },
  accountIntro: { paddingTop: 10, paddingBottom: 18 },
  accountCard: {
    alignItems: "center",
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#eee8e1",
    borderRadius: 14,
    padding: 22,
  },
  accountAvatar: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: "#f1e9df",
    alignItems: "center",
    justifyContent: "center",
  },
  accountName: { color: "#3e332b", fontSize: 17, fontWeight: "600", marginTop: 12 },
  accountEmail: { color: "#8a7e73", fontSize: 12, marginTop: 4 },
  accountAction: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    marginTop: 18,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderColor: "#e9e1d8",
    paddingTop: 14,
    width: "100%",
    justifyContent: "center",
  },
  accountActionText: { color: "#765b46", fontSize: 13, fontWeight: "600" },
  accountLink: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 13,
    marginTop: 11,
    borderWidth: 1,
    borderColor: "#eee8e1",
  },
  accountLinkIcon: {
    width: 38,
    height: 38,
    borderRadius: 11,
    backgroundColor: "#f4eee7",
    alignItems: "center",
    justifyContent: "center",
  },
  accountLinkCopy: { flex: 1, marginLeft: 11 },
  accountLinkTitle: { color: "#493c31", fontSize: 13, fontWeight: "600" },
  accountLinkCaption: { color: "#92867b", fontSize: 11, marginTop: 3 },
  emptyBag: {
    alignItems: "center",
    paddingVertical: 40,
    paddingHorizontal: 16,
    backgroundColor: "#fff",
    borderRadius: 10,
    marginTop: 14,
  },
  emptyTitle: { color: "#352a23", fontSize: 18, fontWeight: "600" },
  primaryButton: {
    backgroundColor: "#614a38",
    borderRadius: 6,
    padding: 15,
    alignItems: "center",
    marginTop: 20,
  },
  primaryButtonText: { color: "#fff", fontWeight: "600", fontSize: 14 },
  cartLine: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 15,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderColor: "#e4dbd1",
  },
  cartImage: { width: 68, height: 76, borderRadius: 6, backgroundColor: "#f0ece6" },
  cartDetails: { flex: 1, paddingHorizontal: 12 },
  quantityRow: { flexDirection: "row", alignItems: "center", gap: 13, marginTop: 9 },
  quantityButton: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: "#eee6dc",
    alignItems: "center",
    justifyContent: "center",
  },
  quantityText: { color: "#594332", fontSize: 15 },
  summary: { paddingTop: 18 },
  summaryLine: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 8,
  },
  totalLabel: { color: "#352a23", fontWeight: "700", fontSize: 15 },
  detailPage: { flex: 1, backgroundColor: "#fbf9f5" },
  detailTopBar: {
    height: 54,
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderColor: "#e8e0d6",
  },
  detailIconButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#fff",
  },
  detailTopTitle: { color: "#5b4939", fontSize: 13, fontWeight: "600" },
  detailScroll: { paddingBottom: 26 },
  detailImage: { width: "100%", height: 370, backgroundColor: "#eee7df" },
  detailCopy: { paddingHorizontal: 22, paddingTop: 22 },
  detailTitle: { color: "#342a23", fontSize: 25, fontWeight: "600", marginTop: 7 },
  detailPrice: { color: "#6a513e", fontSize: 17, fontWeight: "600", marginTop: 8 },
  detailDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: "#e6ddd4",
    marginVertical: 20,
  },
  detailSectionTitle: { color: "#41352c", fontSize: 14, fontWeight: "600" },
  detailDescription: { color: "#675d53", fontSize: 14, lineHeight: 21, marginTop: 8 },
  detailNote: { color: "#918579", fontSize: 12, lineHeight: 18, marginTop: 13 },
  detailActions: {
    paddingHorizontal: 18,
    paddingTop: 12,
    paddingBottom: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderColor: "#e7ded4",
    backgroundColor: "#fff",
  },
  detailAddButton: {
    backgroundColor: "#4c3d32",
    minHeight: 50,
    borderRadius: 8,
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  detailAddButtonText: { color: "#fffaf5", fontSize: 13, fontWeight: "600" },
});
