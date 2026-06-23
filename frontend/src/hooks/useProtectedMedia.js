import { useQuery } from "@tanstack/react-query";

import api from "../services/api";

export default function useProtectedMedia(memoryId) {
  const {
    data: url,

    isLoading,

    isError,
    error,
  } = useQuery({
    queryKey: ["memory-media", memoryId],

    queryFn: async () => {
      console.log("[VIDEO DEBUG] Fetching media token", {
        memoryId,
        timestamp: new Date().toISOString()
      });
      
      try {
        const { data } = await api.get(`/memories/${memoryId}/media-token`);
        
        console.log("[VIDEO DEBUG] Media token received", {
        memoryId,
        url: data.url,
        expiresIn: data.expiresIn,
        timestamp: new Date().toISOString()
      });

        return data.url;
      } catch (err) {
        console.error("[VIDEO DEBUG] Failed to fetch media token", {
          memoryId,
          error: err.message,
          response: err.response?.data,
          timestamp: new Date().toISOString()
        });
        throw err;
      }
    },

    enabled: !!memoryId,
  });

  console.log("[VIDEO DEBUG] useProtectedMedia state", {
    memoryId,
    url: url || 'none',
    loading: isLoading,
    error: isError,
    errorMessage: error?.message,
    timestamp: new Date().toISOString()
  });

  return {
    url: url || "",

    loading: isLoading,

    error: isError,
    errorDetails: error,
  };
}
