import { supabase } from "@/integrations/supabase/client";

/**
 * Utility function to call Supabase Edge Functions with proper error handling
 * Works across Web (PWA), Android, and iOS platforms
 */
export async function callEdgeFunction<T = any>(
  functionName: string,
  body?: Record<string, any>,
  options?: {
    retry?: boolean;
    retryCount?: number;
  }
): Promise<{ data: T | null; error: string | null }> {
  try {
    // Get current session and ensure we have a valid token
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    
    if (sessionError || !session?.access_token) {
      // Try to refresh the session
      const { data: { session: refreshedSession }, error: refreshError } = await supabase.auth.refreshSession();
      
      if (refreshError || !refreshedSession?.access_token) {
        return {
          data: null,
          error: "Your session has expired. Please log in again.",
        };
      }
      
      session = refreshedSession;
    }

    const token = session.access_token;

    // Call the edge function with explicit Authorization header
    const { data, error } = await supabase.functions.invoke(functionName, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body,
    });

    // Handle HTTP errors (non-2xx status codes)
    if (error) {
      let errorMessage = "An error occurred. Please try again.";
      
      // Check if it's an HTTP error (has context.response)
      if (error && typeof error === 'object' && 'context' in error) {
        // Try to extract error message from response
        try {
          const response = (error as any).context?.response;
          if (response && typeof response.text === 'function') {
            const errorText = await response.text();
            if (errorText) {
              try {
                const errorJson = JSON.parse(errorText);
                errorMessage = errorJson.error || errorJson.message || errorMessage;
              } catch {
                // If JSON parsing fails, use the text if it's reasonable
                if (errorText.length < 200 && errorText.trim()) {
                  errorMessage = errorText;
                }
              }
            }
          }
        } catch (parseError) {
          console.error("Error parsing error response:", parseError);
        }
      }
      
      // Fallback to error message if available
      if (error && typeof error === 'object' && 'message' in error) {
        errorMessage = error.message;
      } else if (typeof error === 'string') {
        errorMessage = error;
      }

      // Handle specific error types
      if (errorMessage.includes("Unauthorized") || errorMessage.includes("401")) {
        errorMessage = "Your session has expired. Please log in again.";
      } else if (errorMessage.includes("Missing authorization")) {
        errorMessage = "Authentication required. Please log in again.";
      } else if (errorMessage.includes("Missing required fields")) {
        errorMessage = "Please fill in all required fields.";
      }

      return {
        data: null,
        error: errorMessage,
      };
    }

    // Handle application-level errors from response data
    if (data?.error) {
      return {
        data: null,
        error: data.error,
      };
    }

    return {
      data: data as T,
      error: null,
    };
  } catch (error: any) {
    console.error(`Error calling edge function ${functionName}:`, error);
    
    const errorMessage = error?.message || 
                        error?.error?.message || 
                        "An unexpected error occurred. Please try again.";
    
    return {
      data: null,
      error: errorMessage,
    };
  }
}

