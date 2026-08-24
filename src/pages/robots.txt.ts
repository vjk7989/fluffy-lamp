// https://docs.astro.build/en/guides/integrations-guide/sitemap/#usage
import type { APIRoute } from 'astro';

const robotsTxt = `
User-agent: Googlebot
User-agent: Bingbot
User-agent: GPTBot
User-agent: ChatGPT-User
User-agent: ClaudeBot
User-agent: PerplexityBot
User-agent: CCBot
User-agent: Yandex
User-agent: archive.org_bot
User-agent: *
Disallow:
Allow: /

Sitemap: ${new URL('sitemap-index.xml', `${import.meta.env.SITE}/`).href}
`.trim();

export const GET: APIRoute = () => {
  return new Response(robotsTxt, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
    },
  });
};
