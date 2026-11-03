// Thin client for the FastAPI backend.
// Set VITE_API_URL in frontend/.env to point at another host (e.g. a container).
export const API_URL = (import.meta.env.VITE_API_URL || "http://127.0.0.1:8000").replace(/\/$/, "");

async function request(path, options = {}) {
  let response;
  try {
    response = await fetch(`${API_URL}${path}`, {
      headers: { "Content-Type": "application/json" },
      ...options,
    });
  } catch {
    throw new Error(`Can't reach the API at ${API_URL}. Is the backend running?`);
  }

  const body = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(describeError(body, response.status));
  }
  return body;
}

// FastAPI returns errors as {detail: string | {message} | [{msg, loc}]}.
function describeError(body, status) {
  const detail = body?.detail;
  if (typeof detail === "string") return detail;
  if (detail?.message) return detail.message;
  if (Array.isArray(detail) && detail.length) {
    return detail.map((item) => item.msg.replace(/^Value error, /, "")).join(". ");
  }
  return `Request failed (HTTP ${status})`;
}

export const api = {
  properties: () => request("/api/properties").then((data) => data.properties),
  reservations: () => request("/api/reservations").then((data) => data.reservations),
  stats: () => request("/api/stats"),
  createReservation: (payload) =>
    request("/api/reservations", { method: "POST", body: JSON.stringify(payload) }),
  updateReservationStatus: (id, status) =>
    request(`/api/reservations/${id}`, { method: "PATCH", body: JSON.stringify({ status }) }),
};
