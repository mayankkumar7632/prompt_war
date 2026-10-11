const API_BASE_URL =
  import.meta.env.VITE_API_URL?.replace(/\/$/, "") ||
  (window.location.hostname === "localhost" ? "http://localhost:5000/api" : "/api");

async function post(path, body) {
  let response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  } catch {
    throw new Error("Couldn't reach StoryLearn's server. Make sure the backend is running.");
  }

  const data = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(data?.error || "The request could not be completed.");
  }
  return data;
}

export function registerAccount(details) {
  return post("/auth/register", details);
}

export function loginAccount(credentials) {
  return post("/auth/login", credentials);
}
