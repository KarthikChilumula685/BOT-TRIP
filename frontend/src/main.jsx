import React from "react";
import ReactDOM from "react-dom/client";

import { Toaster } from "react-hot-toast";

import { BrowserRouter } from "react-router-dom";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

import App from "./App";

import { AuthProvider } from "./context/AuthContext";

import "./index.css";

// React Query cache setup

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 10, // 10 minutes

      gcTime: 1000 * 60 * 30, // keep cache 30 minutes

      refetchOnWindowFocus: false,

      retry: 1,
    },
  },
});

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AuthProvider>
          <App />

          <Toaster
            position="top-center"
            toastOptions={{
              style: {
                background: "#ffffff",

                color: "#1f2937",

                border: "1px solid #f3f4f6",

                borderRadius: "18px",

                boxShadow: "0 10px 40px rgba(0,0,0,.12)",
              },
            }}
          />
        </AuthProvider>
      </BrowserRouter>
    </QueryClientProvider>
  </React.StrictMode>,
);
