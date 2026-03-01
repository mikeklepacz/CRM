import { APOLLO_API_BASE } from "./types";

export function getApiKey(): string {
  const apiKey = process.env.APOLLO_API_KEY;
  if (!apiKey) {
    throw new Error("APOLLO_API_KEY environment variable is not set");
  }
  return apiKey;
}

export async function makeApolloRequest<T>(endpoint: string, body: Record<string, any>): Promise<T> {
  const apiKey = getApiKey();

  console.log(`[Apollo API] Request to ${endpoint}`);
  console.log(`[Apollo API] Request body:`, JSON.stringify(body, null, 2));

  const response = await fetch(`${APOLLO_API_BASE}${endpoint}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "no-cache",
      "x-api-key": apiKey,
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.log(`[Apollo API] Error response (${response.status}):`, errorText);
    throw new Error(`Apollo API error (${response.status}): ${errorText}`);
  }

  const result = await response.json();
  console.log(`[Apollo API] Response from ${endpoint}:`, JSON.stringify(result, null, 2).substring(0, 2000));
  return result as T;
}

export async function makeApolloGetRequest<T>(endpoint: string, params: Record<string, string>): Promise<T> {
  const apiKey = getApiKey();

  const queryString = new URLSearchParams(params).toString();
  const url = `${APOLLO_API_BASE}${endpoint}?${queryString}`;

  console.log(`[Apollo API] GET Request to ${endpoint}`);
  console.log(`[Apollo API] Query params:`, JSON.stringify(params, null, 2));

  const response = await fetch(url, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "no-cache",
      "x-api-key": apiKey,
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.log(`[Apollo API] Error response (${response.status}):`, errorText);
    throw new Error(`Apollo API error (${response.status}): ${errorText}`);
  }

  const result = await response.json();
  console.log(`[Apollo API] Response from ${endpoint}:`, JSON.stringify(result, null, 2).substring(0, 2000));
  return result as T;
}
