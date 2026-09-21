import { useEffect } from "react";

const DEFAULT_TITLE = "D'Conde Barbearia";

function metaTag(name: string): HTMLMetaElement {
  let tag = document.head.querySelector<HTMLMetaElement>(`meta[name="${name}"]`);
  if (!tag) {
    tag = document.createElement("meta");
    tag.name = name;
    document.head.appendChild(tag);
  }
  return tag;
}

/**
 * Per-route <title> and meta description. The app is a SPA with a single
 * index.html, so each page sets its own on mount. `noindex` is for pages that
 * shouldn't show up in search results (404, customer area, admin panel).
 */
export function usePageMeta(title: string, description: string, options: { noindex?: boolean } = {}) {
  const { noindex = false } = options;

  useEffect(() => {
    const previousTitle = document.title;
    const descriptionTag = metaTag("description");
    const previousDescription = descriptionTag.content;

    document.title = title;
    descriptionTag.content = description;
    if (noindex) metaTag("robots").content = "noindex, nofollow";

    return () => {
      document.title = previousTitle || DEFAULT_TITLE;
      descriptionTag.content = previousDescription;
      if (noindex) document.head.querySelector('meta[name="robots"]')?.remove();
    };
  }, [title, description, noindex]);
}
