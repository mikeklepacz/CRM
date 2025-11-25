import { QueryClient, QueryFunction } from "@tanstack/react-query";

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    
    // Try to parse JSON error responses and enrich the Error object
    let errorData;
    try {
      errorData = JSON.parse(text);
    } catch (parseError) {
      // If not JSON, throw simple error
      throw new Error(`${res.status}: ${text}`);
    }
    
    // Create enriched error with all error data fields attached
    const error: any = new Error(`${res.status}: ${errorData.error || errorData.message || text}`);
    Object.assign(error, errorData);
    throw error;
  }
}

export async function apiRequest(
  method: string,
  url: string,
  data?: unknown | undefined,
): Promise<any> {
  // Handle FormData separately - don't set Content-Type header (browser will set it with boundary)
  const isFormData = data instanceof FormData;
  
  const res = await fetch(url, {
    method,
    headers: !isFormData && data ? { "Content-Type": "application/json" } : {},
    body: isFormData ? data as FormData : (data ? JSON.stringify(data) : undefined),
    credentials: "include",
  });

  await throwIfResNotOk(res);
  
  // Handle empty responses (204, etc.) without trying to parse JSON
  const text = await res.text();
  return text ? JSON.parse(text) : null;
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    const res = await fetch(queryKey.join("/") as string, {
      credentials: "include",
    });

    if (unauthorizedBehavior === "returnNull" && res.status === 401) {
      return null;
    }

    await throwIfResNotOk(res);
    return await res.json();
  };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: 120000,       // Poll every 2 minutes (reduced from 30s)
      refetchOnWindowFocus: true,    // Refresh when tab regains focus
      staleTime: 120000,             // Data fresh for 2 minutes
      retry: false,
    },
    mutations: {
      retry: false,
    },
  },
});