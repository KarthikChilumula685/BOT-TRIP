import { useQuery } from "@tanstack/react-query";

import api from "../services/api";

export default function useProfilePhoto(userId) {
  const {
    data: url,

    isLoading,

    isError,
    error,
  } = useQuery({
    queryKey: ["profile-photo", userId],

    queryFn: async () => {
      console.log("[PROFILE PHOTO DEBUG] Fetching profile photo token", {
        userId,
        timestamp: new Date().toISOString()
      });
      
      try {
        const { data } = await api.get(`/auth/${userId}/profile-photo-token`);
        
        console.log("[PROFILE PHOTO DEBUG] Profile photo token received", {
          userId,
          url: data.url,
          expiresIn: data.expiresIn,
          timestamp: new Date().toISOString()
        });

        return data.url;
      } catch (err) {
        console.error("[PROFILE PHOTO DEBUG] Failed to fetch profile photo token", {
          userId,
          error: err.message,
          response: err.response?.data,
          timestamp: new Date().toISOString()
        });
        throw err;
      }
    },

    enabled: !!userId,
  });

  return {
    url: url || "",

    loading: isLoading,

    error: isError,
    errorDetails: error,
  };
}
