// ── admin/src/api/api.js ──────────────────────────────────────────────────
// Admin panel API

const BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:5000/api";

// ─── Core fetch wrapper ───────────────────────
const request = async (method, path, body = null, token = null) => {
  const headers = { "Content-Type": "application/json" };
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const res = await fetch(`${BASE}${path}`, {
    method,
    headers,
    credentials: "include",
    body: body ? JSON.stringify(body) : undefined,
  });

  if (res.status === 401) {
    try {
      const refreshRes = await fetch(`${BASE}/auth/refresh`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({}),
      });
      if (refreshRes.ok) {
        const refreshData = await refreshRes.json();
        const newToken = refreshData.data?.accessToken;
        if (newToken) {
          localStorage.setItem("adminToken", newToken);
          const retryHeaders = { "Content-Type": "application/json", "Authorization": `Bearer ${newToken}` };
          const retryRes = await fetch(`${BASE}${path}`, {
            method, headers: retryHeaders, credentials: "include",
            body: body ? JSON.stringify(body) : undefined,
          });
          const retryData = await retryRes.json();
          if (!retryData.success) throw new Error(retryData.error || "Request failed");
          return retryData;
        }
      }
    } catch {}
  }

  const data = await res.json();
  if (!data.success) throw new Error(data.error || "Request failed");
  return data;
};

// ─── Multipart (file uploads) ─────────────────
const upload = async (method, path, formData, token) => {
  const headers = {};
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const res = await fetch(`${BASE}${path}`, {
    method,
    headers,
    credentials: "include",
    body: formData,
  });

  const data = await res.json();
  if (!data.success) throw new Error(data.error || "Upload failed");
  return data;
};

const get   = (path, token)        => request("GET",    path, null, token);
const post  = (path, body, token)  => request("POST",   path, body, token);
const put   = (path, body, token)  => request("PUT",    path, body, token);
const patch = (path, body, token)  => request("PATCH",  path, body, token);
const del   = (path, token)        => request("DELETE", path, null, token);

// ─── Auth ─────────────────────────────────────
export const authApi = {
  login:   (body)  => post("/auth/login", body),
  me:      (token) => get("/auth/me", token),
  logout:  (token) => post("/auth/logout", {}, token),
  refresh: ()      => post("/auth/refresh", {}),
};

// ─── Stream ───────────────────────────────────
// Multi-stream admin API — each stream has its own _id
export const streamApi = {
  // Read — reused by Dashboard too
  getAll:      (token)              => get("/livestream",                              token),
  getById:     (id, token)          => get(`/livestream/${id}`,                        token),

  // Admin CRUD
  create:      (body, token)        => post("/livestream/admin/streams",               body, token),
  updateById:  (id, body, token)    => patch(`/livestream/admin/streams/${id}`,        body, token),
  deleteById:  (id, token)          => del(`/livestream/admin/streams/${id}`,          token),
  toggleById:  (id, token)          => patch(`/livestream/admin/streams/${id}/toggle`, {}, token),

  // Card image
  uploadImage: (id, file, token) => {
    const fd = new FormData();
    fd.append("image", file);
    return upload("PATCH", `/livestream/admin/streams/${id}/image`, fd, token);
  },
  deleteImage: (id, token)          => del(`/livestream/admin/streams/${id}/image`,   token),
};

// ─── Categories ───────────────────────────────
export const categoryApi = {
  getAll:  (token)              => get("/categories?includeInactive=true", token),
  create:  (body, token)        => post("/categories", body, token),
  update:  (id, body, token)    => put(`/categories/${id}`, body, token),
  delete:  (id, token)          => del(`/categories/${id}`, token),
};

// ─── Products ─────────────────────────────────
export const productApi = {
  getAll:  (token)               => get("/products", token),
  create:  (body, token)         => post("/products", body, token),
  update:  (id, body, token)     => put(`/products/${id}`, body, token),
  delete:  (id, token)           => del(`/products/${id}`, token),
  uploadImage: (id, file, token) => {
    const fd = new FormData();
    fd.append("image", file);
    return upload("PATCH", `/products/${id}/image`, fd, token);
  },
  deleteImage: (id, token)       => del(`/products/${id}/image`, token),
  getScreens:   (token)              => get("/admin/screens", token),
  createScreen: (body, token)        => post("/admin/screens", body, token),
  updateScreen: (id, body, token)    => patch(`/admin/screens/${id}`, body, token),
  deleteScreen: (id, token)          => del(`/admin/screens/${id}`, token),
};

// ─── Orders ───────────────────────────────────
export const orderApi = {
  getAll:       (token, params = "") => get(`/orders/admin/all${params}`, token),
  updateStatus: (id, body, token)    => patch(`/orders/admin/${id}/status`, body, token),
};

// ─── Events ───────────────────────────────────
export const eventApi = {
  getAll:  (token)              => get("/events", token),
  create:  (body, token)        => post("/events", body, token),
  update:  (id, body, token)    => put(`/events/${id}`, body, token),
  delete:  (id, token)          => del(`/events/${id}`, token),
};

// ─── Users ────────────────────────────────────
export const userApi = {
  getAll:             (token, params = "") => get(`/users/admin/all${params}`, token),
  getById:            (id, token)          => get(`/users/admin/${id}`, token),
  updateRole:         (id, body, token)    => patch(`/users/admin/${id}/role`, body, token),
  ban:                (id, body, token)    => patch(`/users/admin/${id}/ban`, body, token),
  removeSubscription:       (id, token)              => del(`/users/admin/${id}/subscription`,          token),
  removeSingleSubscription: (id, orderId, token)    => del(`/users/admin/${id}/subscription/${orderId}`, token),
  gift:               (id, body, token)    => post(`/users/admin/${id}/gift`, body, token),
  updateCurrency:     (id, body, token)    => patch(`/users/admin/${id}/currency`, body, token),
};