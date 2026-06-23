import axios from "axios";

export const API_URL =
  import.meta.env.VITE_API_URL || 
  (import.meta.env.PROD ? window.location.origin + "/api" : "/api");

const api = axios.create({
  baseURL: API_URL,
  timeout: 300000, // 5 minutes default timeout for production
  maxContentLength: 500 * 1024 * 1024, // 500MB max response size
  maxBodyLength: 500 * 1024 * 1024 // 500MB max request body
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("botTripToken");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  
  // Log request details for debugging
  if (config.url?.includes('upload')) {
    console.log("[UPLOAD DEBUG] API request initiated", {
      url: config.url,
      method: config.method,
      headers: {
        ...config.headers,
        Authorization: config.headers.Authorization ? 'Bearer [REDACTED]' : 'none'
      },
      timeout: config.timeout,
      timestamp: new Date().toISOString(),
      isMobile: /Mobile|Android|iPhone|iPad/i.test(navigator.userAgent),
      connection: navigator.connection ? {
        effectiveType: navigator.connection.effectiveType,
        downlink: navigator.connection.downlink,
        rtt: navigator.connection.rtt,
        saveData: navigator.connection.saveData
      } : 'Not available'
    });
  }
  
  return config;
});

api.interceptors.response.use(
  (response) => {
    // Log successful responses for upload debugging
    if (response.config.url?.includes('upload')) {
      console.log("[UPLOAD DEBUG] API response received", {
      url: response.config.url,
      status: response.status,
      statusText: response.statusText,
      headers: response.headers,
      dataSize: JSON.stringify(response.data).length,
      timestamp: new Date().toISOString()
    });
    }
    return response;
  },
  (error) => {
    // Log all errors for debugging
    console.error("[UPLOAD DEBUG] API error occurred", {
      url: error.config?.url,
      method: error.config?.method,
      status: error.response?.status,
      statusText: error.response?.statusText,
      responseData: error.response?.data,
      errorMessage: error.message,
      errorCode: error.code,
      stack: error.stack,
      timestamp: new Date().toISOString(),
      isMobile: /Mobile|Android|iPhone|iPad/i.test(navigator.userAgent)
    });
    
    if (error.response?.status === 401) {
      localStorage.removeItem("botTripToken");
      localStorage.removeItem("botTripUser");
      window.dispatchEvent(new Event("bot-trip-unauthorized"));
    }
    // Mobile-specific error handling
    if (error.code === 'ECONNABORTED' && error.message.includes('timeout')) {
      error.message = 'Request timed out. Please check your connection.';
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
