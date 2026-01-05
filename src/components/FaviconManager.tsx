import { useEffect } from 'react';
import { useLogoConfiguration } from '@/hooks/useLogoConfiguration';

// Function to update manifest icons dynamically
function updateManifestIcons(logoUrl: string, faviconUrl: string) {
  try {
    // Remove old manifest link
    const oldManifest = document.querySelector('link[rel="manifest"]');
    if (oldManifest) {
      oldManifest.remove();
    }

    // Create new manifest with dynamic icons
    const manifest = {
      name: "Tagmentia",
      short_name: "Tagmentia",
      description: "Organize and manage your video collections",
      start_url: "/",
      display: "standalone",
      background_color: "#ffffff",
      theme_color: "#3B82F6",
      orientation: "portrait-primary",
      icons: [
        {
          src: faviconUrl,
          sizes: "64x64 32x32 24x24 16x16",
          type: "image/x-icon"
        },
        {
          src: logoUrl,
          sizes: "192x192",
          type: "image/png",
          purpose: "any maskable"
        },
        {
          src: logoUrl,
          sizes: "512x512",
          type: "image/png",
          purpose: "any maskable"
        }
      ],
      share_target: {
        action: "/add",
        method: "GET",
        enctype: "application/x-www-form-urlencoded",
        params: {
          title: "title",
          text: "text",
          url: "url"
        }
      }
    };

    // Create blob URL for dynamic manifest
    const manifestBlob = new Blob([JSON.stringify(manifest)], { type: 'application/json' });
    const manifestUrl = URL.createObjectURL(manifestBlob);

    // Add new manifest link
    const link = document.createElement('link');
    link.rel = 'manifest';
    link.href = manifestUrl;
    document.head.appendChild(link);
  } catch (error) {
    console.error('Failed to update manifest icons:', error);
  }
}

export function FaviconManager() {
  const { currentFaviconUrl, currentLogoUrl } = useLogoConfiguration();

  useEffect(() => {
    const faviconHref = currentFaviconUrl || currentLogoUrl || '/favicon.ico';
    const logoHref = currentLogoUrl || currentFaviconUrl || '/favicon.ico';

    const ensureLink = (rel: string, href: string, id?: string, type?: string) => {
      let link = document.querySelector<HTMLLinkElement>(id ? `link#${id}` : `link[rel="${rel}"]`);
      if (!link) {
        link = document.createElement('link');
        link.rel = rel;
        if (id) link.id = id;
        if (type) link.type = type;
        document.head.appendChild(link);
      }
      // Handle both absolute and relative URLs
      let absolute: string;
      try {
        absolute = new URL(href, window.location.origin).href;
      } catch {
        absolute = href.startsWith('/') ? new URL(href, window.location.origin).href : href;
      }
      if (link.href !== absolute) {
        link.href = absolute;
      }
      if (type && link.type !== type) {
        link.type = type;
      }
    };

    // Remove old favicon links to avoid duplicates
    const oldFavicons = document.querySelectorAll('link[rel="icon"], link[rel="shortcut icon"]');
    oldFavicons.forEach(link => {
      if (!link.id || (link.id !== 'favicon' && !link.id.includes('favicon'))) {
        link.remove();
      }
    });

    // Update all favicon and icon links
    // Determine the correct type based on the file extension
    const getFaviconType = (url: string): string => {
      if (url.includes('.svg')) return 'image/svg+xml';
      if (url.includes('.png')) return 'image/png';
      return 'image/x-icon';
    };

    const faviconType = getFaviconType(faviconHref);
    ensureLink('icon', faviconHref, 'favicon', faviconType);
    ensureLink('shortcut icon', faviconHref, undefined, faviconType);
    
    // Apple touch icon should use the logo if available
    const appleIconType = getFaviconType(logoHref);
    ensureLink('apple-touch-icon', logoHref, 'apple-touch-icon', appleIconType);
    
    // Update manifest icons dynamically for PWA
    updateManifestIcons(logoHref, faviconHref);
  }, [currentFaviconUrl, currentLogoUrl]);

  return null;
}
