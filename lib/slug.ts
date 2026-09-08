function base64ToBase64Url(b64: string): string {
  return b64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function base64UrlToBase64(b64url: string): string {
  const padded = b64url.replace(/-/g, '+').replace(/_/g, '/');
  const pad = padded.length % 4;
  return pad ? padded + '='.repeat(4 - pad) : padded;
}

const IN_NODE = typeof window === 'undefined';

export function urlToSlug(url: string): string {
  if (IN_NODE) {
    return Buffer.from(url, 'utf-8').toString('base64url');
  }
  const b64 = btoa(unescape(encodeURIComponent(url)));
  return base64ToBase64Url(b64);
}

export function slugToUrl(slug: string): string {
  if (IN_NODE) {
    return Buffer.from(base64UrlToBase64(slug), 'base64').toString('utf-8');
  }
  const b64 = base64UrlToBase64(slug);
  return decodeURIComponent(escape(atob(b64)));
}
