const BASE = import.meta.env.VITE_API_BASE_URL || "https://f1-air.onrender.com/api";

const request = async (method, path, body = null, token = null) => {
  const headers = { "Content-Type": "application/json" };
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const res = await fetch(`${BASE}${path}`, {
    method,
    headers,
    credentials: "include",
    body: body ? JSON.stringify(body) : undefined,
  });

  const data = await res.json();
  if (!data.success) throw new Error(data.error || data.message || "Request failed");
  return data;
};

const get  = (path, token)       => request("GET",    path, null, token);
const post = (path, body, token) => request("POST",   path, body, token);
const put  = (path, body, token) => request("PUT",    path, body, token);
const del  = (path, token)       => request("DELETE", path, null, token);

// ─── Auth ─────────────────────────────────────
export const authApi = {
  register:       (body)  => post("/auth/register", body),
  verifyEmail:    (body)  => post("/auth/verify-email", body),
  resendOtp:      (body)  => post("/auth/resend-otp", body),
  login:          (body)  => post("/auth/login", body),
  logout:         (token) => post("/auth/logout", {}, token),
  refresh:        ()      => post("/auth/refresh", {}),
  me:             (token) => get("/auth/me", token),
  forgotPassword: (body)  => post("/auth/forgot-password", body),
  verifyResetOtp: (body)  => post("/auth/verify-reset-otp", body),
  resetPassword:  (body)  => post("/auth/reset-password", body),
  googleLogin:    ()      => { window.location.href = `${BASE}/auth/google`; },
};

// ─── Products ─────────────────────────────────
export const productApi = {
  getAll:    (params = "") => get(`/products${params}`),
  getBySlug: (slug)        => get(`/products/${slug}`),
};

// ─── Events ───────────────────────────────────
export const eventApi = {
  getAll:      () => get("/events"),
  getLive:     () => get("/events/live"),
  getUpcoming: () => get("/events/upcoming"),
};

// ─── Orders + Razorpay ────────────────────────
export const orderApi = {
  // Razorpay (INR / domestic)
  createOrder:       (body, token)  => post("/orders/create-order",       body, token),
  verifyPayment:     (body, token)  => post("/orders/verify-payment",     body, token),
  // LemonSqueezy (USD / EUR / international)
  lsCreateCheckout:  (body, token)  => post("/orders/ls-create-checkout", body, token),
  lsVerify:          (body, token)  => post("/orders/ls-verify",           body, token),
  // Read
  getMyOrders:       (token)        => get("/orders",                     token),
  getById:           (id, token)    => get(`/orders/${id}`,               token),
};

// ─── Livestream ───────────────────────────────
export const streamApi = {
  getAll:    (token)           => get("/livestream",                  token),
  getById:   (id, token)       => get(`/livestream/${id}`,            token),
  join:      (id, body, token) => post(`/livestream/${id}/join`,      body, token),
  heartbeat: (id, body, token) => post(`/livestream/${id}/heartbeat`, body, token),
  leave:     (id, body, token) => post(`/livestream/${id}/leave`,     body, token),
};

// ─── User ─────────────────────────────────────
export const userApi = {
  getProfile:      (token)       => get("/users/profile",       token),
  updateProfile:   (body, token) => put("/users/profile",       body, token),
  getSubscription: (token)       => get("/users/subscription",  token),
  getScreens:      (token)       => get("/users/screens",       token),
};