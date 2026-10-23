// Set VITE_API_URL when the API is hosted on a different domain.
const BASE = import.meta.env.VITE_API_URL || "";

export async function api(path, { method = "GET", body, token } = {}) {
  const res = await fetch(BASE + "/api" + path, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: "Bearer " + token } : {})
    },
    body: body ? JSON.stringify(body) : undefined
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "Something went wrong. Please try again.");
  return data;
}

// Downloads every transaction as a CSV file.
export async function downloadCsv(token) {
  const res = await fetch(BASE + "/api/export", { headers: { Authorization: "Bearer " + token } });
  if (!res.ok) throw new Error("Export failed. Please try again.");
  const url = URL.createObjectURL(await res.blob());
  const a = document.createElement("a");
  a.href = url;
  a.download = "expenses.csv";
  a.click();
  URL.revokeObjectURL(url);
}

export const money = (n) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 2 }).format(n || 0);

export const monthLabel = (m) =>
  new Date(m + "-01T00:00:00").toLocaleDateString("en-IN", { month: "short", year: "numeric" });

export const thisMonth = () => new Date().toISOString().slice(0, 7);
