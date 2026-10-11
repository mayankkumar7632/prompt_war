const API_BASE_URL =
  import.meta.env.VITE_API_URL?.replace(/\/$/, "") ||
  (window.location.hostname === "localhost" ? "http://localhost:5000/api" : "/api");

export async function apiRequest(path, { token, method = "GET", body } = {}) {
  let response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      method,
      headers: {
        ...(body ? { "Content-Type": "application/json" } : {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      ...(body ? { body: JSON.stringify(body) } : {}),
    });
  } catch {
    throw new Error("Couldn't reach StoryLearn's server. Check that the backend is running.");
  }

  const data = await response.json().catch(() => null);
  if (response.status === 401) {
    if (token) window.dispatchEvent(new Event("storylearn:unauthorized"));
    throw new Error("Your session has expired. Please log in again.");
  }
  if (!response.ok) {
    const statusMessages = {
      403: "You do not have permission to view this information.",
      404: "The requested information could not be found.",
    };
    throw new Error(
      statusMessages[response.status] ??
      (response.status >= 500
        ? "Something went wrong. Please try again."
        : data?.error || "The request could not be completed."),
    );
  }
  return data;
}
