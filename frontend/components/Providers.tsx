"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "react-hot-toast";
import { useState } from "react";
import { SessionProvider } from "next-auth/react";
import { AuthProvider } from "@/app/contexts/AuthContext";

export default function Providers({
  children,
}: {
  children: React.ReactNode;
}) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 30000,
            retry: 2,
            refetchOnWindowFocus: false,
          },
        },
      })
  );

  return (
    <SessionProvider>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>{children}</AuthProvider>

        <Toaster
          position="bottom-right"
          toastOptions={{
            duration: 4000,
          }}
        />
      </QueryClientProvider>
    </SessionProvider>
  );
}