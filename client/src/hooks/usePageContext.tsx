
import { useLocation } from 'wouter';

// Navigation hook - returns location and navigate function
export function useNavigation() {
  const [location, setLocation] = useLocation();
  
  return {
    location,
    navigate: setLocation,
  };
}

interface PageContextData {
  storeName?: string;
  pocName?: string;
  pocEmail?: string;
  pocPhone?: string;
  storeNotes?: string;
  [key: string]: any;
}

// Page context hook - returns page-specific context data
export function usePageContext(): PageContextData | null {
  const [location] = useLocation();

  // Check if we're on the store details page
  const storeDetailsMatch = location.match(/\/store\/(.+)/);
  if (storeDetailsMatch) {
    // Try to get store data from the DOM or session storage
    const storeId = storeDetailsMatch[1];
    
    // Attempt to read from sessionStorage if available
    try {
      const storeData = sessionStorage.getItem(`store-context-${storeId}`);
      if (storeData) {
        return JSON.parse(storeData);
      }
    } catch (e) {
      // Ignore errors
    }

    // Could also try to extract from visible DOM elements
    // This is a fallback approach
    return null;
  }

  // Check if we're on client dashboard page with selected client
  if (location === '/sales-dashboard' || location === '/clients') {
    // Try to get selected client data from session storage
    try {
      const selectedClient = sessionStorage.getItem('selected-client-context');
      if (selectedClient) {
        return JSON.parse(selectedClient);
      }
    } catch (e) {
      // Ignore errors
    }
  }

  return null;
}

// Helper function to set page context (can be called from pages when a store/client is selected)
export function setPageContext(contextData: PageContextData | null) {
  try {
    if (contextData) {
      sessionStorage.setItem('page-context', JSON.stringify(contextData));
    } else {
      sessionStorage.removeItem('page-context');
    }
  } catch (e) {
    // Ignore errors
  }
}

// Helper to get current context
export function getPageContext(): PageContextData | null {
  try {
    const context = sessionStorage.getItem('page-context');
    return context ? JSON.parse(context) : null;
  } catch (e) {
    return null;
  }
}
