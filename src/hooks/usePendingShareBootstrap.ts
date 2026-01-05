import { useEffect } from "react";
import { useNavigate } from "react-router-dom";

/**
 * Bootstrap hook to consume a shared URL when the app starts.
 * - If the current URL has ?url=..., navigate to /add with that url.
 * - Otherwise, if localStorage has pendingShare (set by native share flows),
 *   consume it, clear it, and navigate to /add with that url.
 *
 * Works on web and native (Capacitor) because it uses window + localStorage.
 */
export function usePendingShareBootstrap() {
  const navigate = useNavigate();

  useEffect(() => {
    // Prefer explicit url query param
    const params = new URLSearchParams(window.location.search);
    const sharedUrl = params.get("url");
    if (sharedUrl) {
      const decodedUrl = decodeURIComponent(sharedUrl);
      // If URL is "IMAGE_SHARED" or starts with "data:image", redirect to AddSharedScreen
      if (decodedUrl === 'IMAGE_SHARED' || decodedUrl.startsWith('data:image')) {
        navigate(`/add-shared-screen?url=${sharedUrl}`, { replace: true });
      } else {
        navigate(`/add?url=${sharedUrl}`, { replace: true });
      }
      return;
    }

    // Fallback to pendingShare in localStorage (set by native share handling)
    const pending = localStorage.getItem("pendingShare");
    if (pending && pending.trim()) {
      localStorage.removeItem("pendingShare");
      const decodedPending = decodeURIComponent(pending.trim());
      const encoded = encodeURIComponent(pending.trim());
      // If URL is "IMAGE_SHARED" or starts with "data:image", redirect to AddSharedScreen
      if (decodedPending === 'IMAGE_SHARED' || decodedPending.startsWith('data:image')) {
        navigate(`/add-shared-screen?url=${encoded}`, { replace: true });
      } else {
        navigate(`/add?url=${encoded}`, { replace: true });
      }
    }
  }, [navigate]);
}


