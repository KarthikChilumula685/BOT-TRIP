import axios from "axios";

export const API_URL =
  import.meta.env.VITE_API_URL || 
  (import.meta.env.PROD ? window.location.origin + "/api" : "/api");

const api = axios.create({
  baseURL: API_URL,
  timeout: 300000 // 5 minutes default timeout for production
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("botTripToken");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem("botTripToken");
      localStorage.removeItem("botTripUser");
      window.dispatchEvent(new Event("bot-trip-unauthorized"));
    }
    return Promise.reject(error);
  }
);

export function getErrorMessage(error) {
  return (
    error.response?.data?.message ||
    error.message ||
    "Something went wrong. Please try again."
  );
}

export async function downloadMemory(memory) {
  const response = await api.get(`/memories/${memory._id}/download`, {
    responseType: "blob",
    timeout: 120000
  });
  const url = URL.createObjectURL(response.data);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = memory.fileName;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

export default api;
