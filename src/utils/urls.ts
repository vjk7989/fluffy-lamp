const base = import.meta.env.BASE_URL.replace(/\/$/, '');

export function withBase(path?: string): string | undefined {
  if (!path || path === '#') return path;
  if (/^(https?:|mailto:|tel:)/.test(path)) return path;
  if (!path.startsWith('/')) return path;
  return `${base}${path}`;
}

export function withBasePage(path?: string): string | undefined {
  const href = withBase(path);
  if (!href || href === '#' || href.includes('.') || href.endsWith('/')) {
    return href;
  }
  return `${href}/`;
}
