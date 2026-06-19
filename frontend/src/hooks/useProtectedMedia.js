import { useQuery } from "@tanstack/react-query";

import api from "../services/api";

export default function useProtectedMedia(memoryId) {
  const {
    data: url,

    isLoading,

    isError,
  } = useQuery({
    queryKey: ["memory-media", memoryId],

    queryFn: async () => {
      const { data } = await api.get(`/memories/${memoryId}/media-token`);

      return data.url;
    },

    enabled: !!memoryId,
  });

  return {
    url: url || "",

    loading: isLoading,

    error: isError,
  };
}
