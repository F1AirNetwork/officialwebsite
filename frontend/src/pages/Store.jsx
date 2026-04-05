import { useState, useEffect } from "react";
import { useNavigate }         from "react-router-dom";
import homeBg   from "../assets/home-bg.png";
import premium  from "../assets/products/premium.png";
import xclusive from "../assets/products/xclusive.png";
import elite    from "../assets/products/elite.png";
import dcpr     from "../assets/products/dcpr.png";
import youtube  from "../assets/products/youtube.png";
import netflix  from "../assets/products/netflix.png";
import { productApi, orderApi } from "../api/api.js";
import { useAuth }              from "../context/AuthContext.jsx";

// ─── Local image fallback map ──────────────────
const localImages = { premium, xclusive, elite, dcpr, youtube, netflix };

const resolveImage = (product) => {
  if (product.image) return product.image; // ✅ FIX

  const slug = (product.slug || product.name || "").toLowerCase();

  if (slug.includes("f1") && slug.includes("premium"))  return localImages.premium;
  if (slug.includes("xclusive"))  return localImages.xclusive;
  if (slug.includes("elite"))     return localImages.elite;
  if (slug.includes("discord"))   return localImages.dcpr;
  if (slug.includes("youtube"))   return localImages.youtube;
  if (slug.includes("netflix"))   return localImages.netflix;

  return null;
};

// ─── Currency helpers ─────────────────────────
const CURRENCY_SYMBOLS = { INR: "₹", USD: "$", EUR: "€" };

const getDisplayPrice = (product, currency) => {
  if (currency === "INR" && product.priceINR != null) return { symbol: "₹", amount: product.priceINR };
  if (currency === "EUR" && product.priceEUR != null) return { symbol: "€", amount: product.priceEUR };
  if (product.priceUSD != null) return { symbol: "$", amount: product.priceUSD };
  return { symbol: "$", amount: product.price ?? 0 };
};

// Check if user already owns this product
const isPurchased = (product, user) => {
  if (!user) return false;
  if (product.type === "subscription") {
    return (
      user.subscription?.status === "active" &&
      (user.subscription?.product === product._id ||
       user.subscription?.productName === product.name)
    );
  }
  if (product.type === "screen") {
    return (user.screenPurchases || []).some(
      (s) => s.product === product._id || s.productName === product.name
    );
  }
  return false;
};

// ─── Load Razorpay script once ─────────────────
const loadRazorpayScript = () =>
  new Promise((resolve) => {
    if (document.getElementById("razorpay-script")) return resolve(true);
    const script    = document.createElement("script");
    script.id       = "razorpay-script";
    script.src      = "https://checkout.razorpay.com/v1/checkout.js";
    script.onload   = () => resolve(true);
    script.onerror  = () => resolve(false);
    document.body.appendChild(script);
  });

const Store = () => {
  const navigate = useNavigate();
  const { user, token, setUser, refreshUser } = useAuth();

  const [products, setProducts]             = useState([]);
  const [categories, setCategories]         = useState(["All"]);
  const [activeCategory, setActiveCategory] = useState("All");
  const [loading, setLoading]               = useState(true);
  const [error, setError]                   = useState("");
  const [payingId, setPayingId]             = useState(null); // product._id currently being paid
  const [toast, setToast]                   = useState(null); // { type, msg }

  const currency = user?.currency || "INR";

  useEffect(() => {
    productApi.getAll()
      .then((res) => {
        const all = res.data?.products || [];
        setProducts(all);
        const cats = ["All", ...new Set(all.map((p) => p.category).filter(Boolean))];
        setCategories(cats);
      })
      .catch(() => setError("Failed to load products."))
      .finally(() => setLoading(false));
  }, []);

  const showToast = (type, msg) => {
    setToast({ type, msg });
    setTimeout(() => setToast(null), 5000);
  };

  // ── Main checkout handler ────────────────────
  // ─── Route to correct payment gateway based on user currency ─────────────
  const handleBuy = async (product) => {
    if (!user) {
      navigate("/login", { state: { from: "/store" } });
      return;
    }

    setPayingId(product._id);

    try {
      const currency = user.currency || "INR";

      // ── LemonSqueezy for international (USD / EUR) ──────────────────────
      if (currency === "USD" || currency === "EUR") {
        const res = await orderApi.lsCreateCheckout({ productId: product._id }, token);
        const { checkoutUrl, productName, orderId } = res.data;

        // Store orderId BEFORE redirect so PaymentSuccess can verify
        if (orderId) {
          sessionStorage.setItem("ls_pending_order", orderId);
          localStorage.setItem("ls_pending_order", orderId); // double-store as fallback
        }

        showToast("success", `Redirecting to checkout for ${productName}...`);
        await new Promise(r => setTimeout(r, 800));

        // Append orderId to the LS redirect_url isn't possible directly,
        // but we append it to the checkoutUrl as a query param via our backend redirect
        window.location.href = checkoutUrl;
        return;
      }

      // ── Razorpay for domestic (INR) ─────────────────────────────────────
      const loaded = await loadRazorpayScript();
      if (!loaded) {
        showToast("error", "Payment gateway failed to load. Check your internet connection.");
        return;
      }

      const res = await orderApi.createOrder({ productId: product._id }, token);
      const { orderId, razorpayOrderId, amount, currency: rzpCurrency, keyId, prefill, productName } = res.data;

      await new Promise((resolve, reject) => {
        const rzp = new window.Razorpay({
          key:         keyId,
          amount,
          currency:    rzpCurrency,
          order_id:    razorpayOrderId,
          name:        "F1 Air Network",
          description: productName,
          image:       "/logo.png",
          prefill:     { name: prefill.name, email: prefill.email },
          theme:       { color: "#e10600" },
          modal:       { ondismiss: () => reject(new Error("Payment cancelled.")) },
          handler: async (response) => {
            try {
              await orderApi.verifyPayment(
                {
                  orderId,
                  razorpayOrderId:   response.razorpay_order_id,
                  razorpayPaymentId: response.razorpay_payment_id,
                  razorpaySignature: response.razorpay_signature,
                },
                token
              );
              if (refreshUser) await refreshUser();
              showToast("success", `🎉 Payment successful! ${productName} has been activated.`);
              resolve();
            } catch (verifyErr) {
              reject(verifyErr);
            }
          },
        });
        rzp.on("payment.failed", (r) => reject(new Error(r.error?.description || "Payment failed.")));
        rzp.open();
      });

    } catch (err) {
      if (err.message !== "Payment cancelled.") {
        showToast("error", err.message || "Payment failed. Please try again.");
      }
    } finally {
      setPayingId(null);
    }
  };

  const filtered = products.filter((p) => {
    if (!p.isActive) return false;
    if (activeCategory === "All") return true;
    return p.category === activeCategory;
  });

  return (
    <main className="relative min-h-screen overflow-hidden">

      {/* Background */}
      <div className="fixed inset-0 z-0"
        style={{ backgroundImage: `url(${homeBg})`, backgroundSize: "cover", backgroundPosition: "center" }} />
      <div className="fixed inset-0 z-10 bg-black/85" />

      {/* Toast */}
      {toast && (
        <div className={`fixed top-24 left-1/2 -translate-x-1/2 z-50 px-6 py-3 rounded-lg text-sm font-medium shadow-xl border transition-all
          ${toast.type === "success"
            ? "bg-green-500/10 border-green-500/30 text-green-300"
            : "bg-red-500/10 border-red-500/30 text-red-400"}`}>
          {toast.msg}
        </div>
      )}

      <div className="relative z-20 px-6 pb-32 pt-36 lg:px-12">
        <div className="max-w-6xl mx-auto">

          {/* Header */}
          <div className="flex flex-col gap-6 mb-16 md:flex-row md:items-center md:justify-between">
            <h1 className="text-4xl tracking-widest uppercase font-f1_n">
              {activeCategory === "All" ? "Store" : activeCategory}
            </h1>
            <select
              value={activeCategory}
              onChange={(e) => setActiveCategory(e.target.value)}
              className="px-5 py-2 text-sm tracking-widest uppercase transition border rounded-md bg-black/60 border-white/20 backdrop-blur-md focus:outline-none hover:border-white"
            >
              {categories.map((cat) => <option key={cat} value={cat}>{cat}</option>)}
            </select>
          </div>

          {/* Currency notice for non-INR users */}
          {user && currency !== "INR" && (
            <div className="flex items-center gap-2 px-4 py-3 mb-8 text-xs border rounded-lg text-white/40 border-white/10 bg-white/5 w-fit">
              <span>Prices shown in {currency}.</span>
              <span className="text-white/20">Charged in INR equivalent at checkout.</span>
            </div>
          )}

          {loading && (
            <div className="flex justify-center py-20">
              <div className="w-10 h-10 border-2 border-white rounded-full border-t-transparent animate-spin" />
            </div>
          )}
          {error && <p className="py-10 text-center text-red-400">{error}</p>}

          {!loading && !error && (
            <div className="grid gap-10 md:grid-cols-3 place-items-center">
              {filtered.length === 0 && (
                <p className="col-span-3 py-16 text-center text-white/50">No products found.</p>
              )}
              {filtered.map((product) => {
                const img          = resolveImage(product);
                const priceInfo    = getDisplayPrice(product, currency);
                const isThisPaying = payingId === product._id;
                const owned        = isPurchased(product, user);

                return (
                  <div key={product._id}
                    className="flex flex-col w-full max-w-xs overflow-hidden transition duration-300 border bg-white/5 backdrop-blur-lg border-white/10 rounded-xl hover:scale-105">

                    {/* Image with purchased overlay */}
                    <div className="relative overflow-hidden aspect-square">
                      {img ? (
                        <img
                          src={img}
                          alt={product.name}
                          className={`w-full h-full object-cover transition duration-300 ${owned ? "blur-sm scale-105 brightness-50" : ""}`}
                        />
                      ) : (
                        <div className="flex items-center justify-center w-full h-full bg-white/5">
                          <span className="text-sm uppercase font-f1 text-white/20">{product.category}</span>
                        </div>
                      )}
                      {owned && (
                        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2">
                          <div className="flex items-center justify-center border-2 border-green-400 rounded-full w-14 h-14 bg-black/40">
                            <svg className="text-green-400 w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                            </svg>
                          </div>
                          <span className="font-f1 uppercase tracking-[0.2em] text-green-400 text-sm font-bold drop-shadow-lg">
                            Purchased
                          </span>
                          {user?.subscription?.renewalDate && product.type === "subscription" && (
                            <span className="text-white/50 text-[10px] tracking-wider">
                              Renews {new Date(user.subscription.renewalDate).toLocaleDateString()}
                            </span>
                          )}
                        </div>
                      )}
                    </div>

                    <div className="flex flex-col flex-1 p-6 text-center">
                      {product.category && (
                        <span className="text-[10px] uppercase tracking-widest text-white/30 mb-1">
                          {product.category}
                        </span>
                      )}
                      <h3 className="mb-2 text-base uppercase font-f1">{product.name}</h3>
                      {product.description && (
                        <p className="mb-4 text-xs leading-relaxed text-white/50 line-clamp-2">
                          {product.description}
                        </p>
                      )}
                      <p className="mb-6 text-lg font-semibold text-white">
                        {priceInfo.symbol}{priceInfo.amount}
                        {product.billingCycle && product.billingCycle !== "one_time"
                          ? <span className="text-sm font-normal text-white/40">/{product.billingCycle}</span>
                          : null}
                      </p>

                      {owned ? (
                        <div className="mt-auto flex items-center justify-center gap-2 border border-green-500/30 bg-green-500/10 text-green-400 px-6 py-2.5 rounded text-xs uppercase tracking-widest mx-auto">
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                          </svg>
                          Active
                        </div>
                      ) : (
                        <button
                          onClick={() => handleBuy(product)}
                          disabled={!!payingId}
                          className="mt-auto border border-white/30 px-6 py-2.5 uppercase text-xs tracking-widest
                                     hover:bg-white  hover:border-white transition
                                     disabled:opacity-50 disabled:cursor-not-allowed
                                     flex items-center justify-center gap-2 mx-auto"
                        >
                          {isThisPaying ? (
                            <>
                              <span className="w-3 h-3 border border-white rounded-full border-t-transparent animate-spin" />
                              Processing...
                            </>
                          ) : (
                            !user ? "Sign In to Buy" : "Buy Now"
                          )}
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

        </div>
      </div>
    </main>
  );
};

export default Store;