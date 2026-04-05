import { useEffect, useState, useRef } from "react";
import { useLocation, useSearchParams, Link } from "react-router-dom";
import homeBg from "../assets/home-bg.png";
import { useAuth } from "../context/AuthContext.jsx";
import { orderApi } from "../api/api.js";

const PaymentSuccess = () => {
  const { state }                   = useLocation();
  const [searchParams]              = useSearchParams();
  const { refreshUser, token }      = useAuth();
  const [status, setStatus]         = useState("pending"); // pending | activated | failed
  const [attempts, setAttempts]     = useState(0);
  const timerRef                    = useRef(null);

  const gateway     = searchParams.get("gateway");
  const orderId     = searchParams.get("order_id")
                        || state?.orderId
                        || sessionStorage.getItem("ls_pending_order")
                        || localStorage.getItem("ls_pending_order");
  const isLS        = gateway === "ls";
  const productName = state?.productName || "your subscription";

  useEffect(() => {
    if (!isLS) {
      setStatus("activated");
      return;
    }

    // Poll backend every 3 seconds up to 10 times (30s total)
    // to check if LS webhook has fired or verify directly via LS API
    const poll = async (attempt) => {
      if (attempt >= 10) {
        setStatus("failed");
        return;
      }

      console.log(`[PaymentSuccess] Polling attempt ${attempt + 1}, orderId:`, orderId, "token:", !!token);

      try {
        if (orderId && token) {
          const res = await orderApi.lsVerify({ orderId }, token);
          console.log("[PaymentSuccess] lsVerify response:", res.data);
          if (res.data?.activated) {
            sessionStorage.removeItem("ls_pending_order");
            localStorage.removeItem("ls_pending_order");
            if (refreshUser) await refreshUser();
            setStatus("activated");
            return;
          }
        } else {
          console.warn("[PaymentSuccess] Missing orderId or token", { orderId, hasToken: !!token });
        }
      } catch (err) {
        console.error("[PaymentSuccess] lsVerify error:", err.message);
      }

      setAttempts(attempt + 1);
      timerRef.current = setTimeout(() => poll(attempt + 1), 3000);
    };

    // Start polling after 2s to give webhook a chance to fire first
    timerRef.current = setTimeout(() => poll(0), 2000);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [isLS, orderId, token]);

  return (
    <main className="relative flex items-center justify-center min-h-screen overflow-hidden">
      <div className="fixed inset-0 z-0"
        style={{ backgroundImage: `url(${homeBg})`, backgroundSize: "cover", backgroundPosition: "center" }} />
      <div className="fixed inset-0 z-10 bg-black/85" />

      <div className="relative z-20 max-w-md px-6 mx-auto text-center">

        {/* Icon */}
        <div className={`w-20 h-20 mx-auto mb-6 rounded-full border-2 flex items-center justify-center transition-colors duration-500 ${
          status === "activated" ? "border-green-400" :
          status === "failed"    ? "border-red-400"   :
          "border-white/30 animate-pulse"
        }`}>
          {status === "activated" && (
            <svg className="w-10 h-10 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          )}
          {status === "failed" && (
            <svg className="w-10 h-10 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M12 3a9 9 0 100 18A9 9 0 0012 3z" />
            </svg>
          )}
          {status === "pending" && (
            <svg className="w-8 h-8 text-white/50 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
            </svg>
          )}
        </div>

        {/* Title */}
        <h1 className="mb-3 text-3xl tracking-widest uppercase font-f1">
          {status === "activated" ? "Payment Successful" :
           status === "failed"    ? "Activation Delayed" :
           "Processing Payment"}
        </h1>

        {/* Message */}
        {status === "activated" && (
          <p className="mb-8 text-sm text-white/80">
            {isLS ? "Your subscription has been activated." : (
              <><span className="font-semibold text-white">{productName}</span> has been activated on your account.</>
            )}
          </p>
        )}

        {status === "pending" && (
          <div className="mb-8">
            <p className="mb-2 text-sm text-white/60">Activating your subscription...</p>
            <p className="text-xs text-white/30">This usually takes a few seconds. Please wait.</p>
            <div className="flex justify-center gap-1 mt-4">
              {[...Array(10)].map((_, i) => (
                <div key={i} className={`w-1.5 h-1.5 rounded-full transition-colors ${
                  i < attempts ? "bg-brand" : "bg-white/20"
                }`} />
              ))}
            </div>
          </div>
        )}

        {status === "failed" && (
          <div className="mb-8">
            <p className="mb-2 text-sm text-white/60">
              Your payment was received but activation is taking longer than usual.
            </p>
            <p className="text-xs text-white/40">
              Your subscription will be activated automatically within a few minutes.
              If it doesn't activate, contact support with your order ID.
            </p>
            {orderId && (
              <p className="mt-2 font-mono text-xs text-white/30">Order: {orderId}</p>
            )}
          </div>
        )}

        {/* Actions */}
        {status !== "pending" && (
          <div className="flex flex-col justify-center gap-4 sm:flex-row">
            <Link to="/livestream"
              className="px-8 py-3 text-xs tracking-widest uppercase transition border border-white font-f1 hover:bg-white hover:text-black">
              Watch Live
            </Link>
            <Link to="/store"
              className="px-8 py-3 text-xs tracking-widest uppercase transition border font-f1 border-white/30 hover:border-white text-white/60 hover:text-white">
              Back to Store
            </Link>
          </div>
        )}
      </div>
    </main>
  );
};

export default PaymentSuccess;