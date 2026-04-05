import { Link } from "react-router-dom";
import { useEffect, useState } from "react";
import { productApi } from "../../api/api.js";
import { useAuth } from "../../context/AuthContext.jsx";

// Local fallback images keyed by slug/name (used when no Cloudinary image yet)
import premium  from "../../assets/products/premium.png";
import xclusive from "../../assets/products/xclusive.png";
import elite    from "../../assets/products/elite.png";
import dcpr     from "../../assets/products/dcpr.png";
import youtube  from "../../assets/products/youtube.png";
import netflix  from "../../assets/products/netflix.png";

const FALLBACKS = {
  "f1-premium":       premium,
  "discord-xclusive": xclusive,
  "discord-elite":    elite,
  "elite-pack":       elite,
  "discord-premium":  dcpr,
  "youtube-premium":  youtube,
  "netflix":          netflix,
};

const resolveImage = (p) => {
  if (p.image) return p.image;
  if (p.slug && FALLBACKS[p.slug]) return FALLBACKS[p.slug];
  const n = p.name?.toLowerCase() || "";
  if (n.includes("youtube"))  return youtube;
  if (n.includes("netflix"))  return netflix;
  if (n.includes("xclusive")) return xclusive;
  if (n.includes("elite"))    return elite;
  if (n.includes("discord"))  return dcpr;
  if (n.includes("premium"))  return premium;
  return null;
};

// Currency helper - matches Store.jsx logic
const getDisplayPrice = (product, currency) => {
  if (currency === "INR" && product.priceINR != null) return { symbol: "₹", amount: product.priceINR };
  if (currency === "EUR" && product.priceEUR != null) return { symbol: "€", amount: product.priceEUR };
  if (product.priceUSD != null) return { symbol: "$", amount: product.priceUSD };
  return { symbol: "$", amount: product.price ?? 0 };
};

// Skeleton card shown while loading
const SkeletonCard = () => (
  <div className="w-full max-w-xs overflow-hidden border bg-white/5 border-white/10 rounded-xl animate-pulse">
    <div className="aspect-square bg-white/10" />
    <div className="p-6 space-y-3">
      <div className="w-3/4 h-4 mx-auto rounded bg-white/10" />
      <div className="w-1/3 h-3 mx-auto rounded bg-white/10" />
      <div className="w-1/2 h-8 mx-auto mt-4 rounded bg-white/10" />
    </div>
  </div>
);

const TopSellerSection = () => {
  const { user } = useAuth();
  const [products, setProducts] = useState([]);
  const [loading, setLoading]   = useState(true);
  const currency = user?.currency || "INR";

  useEffect(() => {
    productApi.getAll()
      .then((res) => {
        const all = res.data?.products || [];
        // Featured products first, then fall back to first 3 active ones
        const featured = all.filter((p) => p.isActive && p.isFeatured).slice(0, 3);
        const shown    = featured.length > 0 ? featured : all.filter((p) => p.isActive).slice(0, 3);
        setProducts(shown);
      })
      .catch(() => {/* silently fail — keep empty */})
      .finally(() => setLoading(false));
  }, []);

  return (
    <section className="relative z-20 py-28">
      <div className="px-6 mx-auto text-center max-w-7xl">

        {/* Heading */}
        <h2 className="mb-4 text-3xl tracking-widest text-white uppercase font-f1">
          Our Top Sellers
        </h2>
        <div className="w-16 h-px mx-auto mb-16 bg-white" />

        {/* Grid */}
        <div className="grid gap-10 md:grid-cols-3 place-items-center">
          {loading
            ? [0, 1, 2].map((i) => <SkeletonCard key={i} />)
            : products.length === 0
            ? <p className="col-span-3 py-10 text-sm text-white/40">No featured products yet.</p>
            : products.map((product) => {
                const img = resolveImage(product);
                return (
                  <div
                    key={product._id}
                    className="w-full max-w-xs overflow-hidden transition duration-300 border bg-white/5 backdrop-blur-lg border-white/10 rounded-xl hover:scale-105"
                  >
                    {/* Image */}
                    {img ? (
                      <div className="overflow-hidden aspect-square">
                        <img src={img} alt={product.name} className="object-cover w-full h-full" />
                      </div>
                    ) : (
                      <div className="flex items-center justify-center aspect-square bg-white/5">
                        <span className="text-5xl">🏎</span>
                      </div>
                    )}

                    {/* Content */}
                    <div className="p-6 text-center">
                      <h3 className="mb-3 text-lg uppercase font-f1">{product.name}</h3>
                      <p className="mb-4 text-white/70">
                        {(() => {
                          const { symbol, amount } = getDisplayPrice(product, currency);
                          return `${symbol}${amount}`;
                        })()}
                        {product.billingCycle && product.billingCycle !== "one_time"
                          ? `/${product.billingCycle}`
                          : ""}
                      </p>
                      <Link
                        to="/store"
                        className="inline-block px-6 py-2 text-xs tracking-widest uppercase transition duration-300 border border-white/30 hover:border-white"
                      >
                        View Product
                      </Link>
                    </div>
                  </div>
                );
              })
          }
        </div>

        {/* Explore button */}
        <div className="flex justify-center mt-14">
          <Link
            to="/store"
            onClick={() => window.scrollTo(0, 0)}
            className="px-10 py-4 tracking-widest text-white uppercase transition border border-white font-f1 hover:bg-gray-500 hover:text-black"
          >
            Explore Store
          </Link>
        </div>

      </div>
    </section>
  );
};

export default TopSellerSection;