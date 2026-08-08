import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';
import sitemap from '@astrojs/sitemap';
import starlight from '@astrojs/starlight';

import mdx from '@astrojs/mdx';

// https://astro.build/config
export default defineConfig({
  // https://docs.astro.build/en/guides/images/#authorizing-remote-images
  site: 'https://www.pavii.tech',
  image: {
    domains: ['images.unsplash.com'],
  },
  // i18n: {
  //   defaultLocale: "en",
  //   locales: ["en", "fr"],
  //   fallback: {
  //     fr: "en",
  //   },
  //   routing: {
  //     prefixDefaultLocale: false,
  //   },
  // },
  prefetch: true,
  integrations: [
    sitemap({
      filter: page =>
        ![
          '/advanced/',
          '/construction/',
          '/tools/',
          '/guides/',
          '/welcome-to-docs/',
          '/de/',
          '/es/',
          '/fa/',
          '/fr/',
          '/ja/',
          '/zh-cn/',
        ].some(path => new URL(page).pathname.startsWith(path)),
      i18n: {
        defaultLocale: 'en', // All urls that don't contain language prefix will be treated as default locale
        locales: {
          en: 'en', // The `defaultLocale` value must present in `locales` keys
          fr: 'fr',
        },
      },
    }),
    starlight({
      title: 'PAVIi.AI Docs',
      // https://github.com/withastro/starlight/blob/main/packages/starlight/CHANGELOG.md
      // If no Astro and Starlight i18n configurations are provided, the built-in default locale is used in Starlight and a matching Astro i18n configuration is generated/used.
      // If only a Starlight i18n configuration is provided, an equivalent Astro i18n configuration is generated/used.
      // If only an Astro i18n configuration is provided, the Starlight i18n configuration is updated to match it.
      // If both an Astro and Starlight i18n configurations are provided, an error is thrown.
      locales: {
        root: {
          label: 'English',
          lang: 'en',
        },
        de: { label: 'Deutsch', lang: 'de' },
        es: { label: 'Español', lang: 'es' },
        fa: { label: 'Persian', lang: 'fa', dir: 'rtl' },
        fr: { label: 'Français', lang: 'fr' },
        ja: { label: '日本語', lang: 'ja' },
        'zh-cn': { label: '简体中文', lang: 'zh-CN' },
      },
      // https://starlight.astro.build/guides/sidebar/
      sidebar: [
        {
          label: 'Quick Start Guides',
          translations: {
            de: 'Schnellstartanleitungen',
            es: 'Guías de Inicio Rápido',
            fa: 'راهنمای شروع سریع',
            fr: 'Guides de Démarrage Rapide',
            ja: 'クイックスタートガイド',
            'zh-cn': '快速入门指南',
          },
          items: [{ autogenerate: { directory: 'guides' } }],
        },
        {
          label: 'AI Products',
          items: [
            { label: 'Dev Tools', link: '/products/dev-tools/' },
            { label: 'Agentic Experience', link: '/products/AX/' },
          ],
        },
        {
          label: 'AI Services',
          items: [{ label: 'Services', link: '/services/' }],
        },
        {
          label: 'Advanced Topics',
          items: [{ autogenerate: { directory: 'advanced' } }],
        },
      ],
      social: [
        {
          icon: 'github',
          label: 'GitHub',
          href: 'https://github.com/buckleson',
        },
      ],
      disable404Route: true,
      customCss: ['./src/assets/styles/starlight.css'],
      favicon: '/favicon.ico',
      components: {
        SiteTitle: './src/components/ui/starlight/SiteTitle.astro',
        Head: './src/components/ui/starlight/Head.astro',
        ThemeProvider: './src/components/ui/starlight/ThemeProvider.astro',
        MobileMenuFooter:
          './src/components/ui/starlight/MobileMenuFooter.astro',
        ThemeSelect: './src/components/ui/starlight/ThemeSelect.astro',
      },
      head: [
        {
          tag: 'meta',
          attrs: {
            property: 'og:image',
            content:
              'https://www.pavii.tech' + '/pavii-social-preview-v2.png',
          },
        },
        {
          tag: 'meta',
          attrs: {
            property: 'og:image:secure_url',
            content:
              'https://www.pavii.tech' + '/pavii-social-preview-v2.png',
          },
        },
        {
          tag: 'meta',
          attrs: {
            name: 'twitter:image',
            content:
              'https://www.pavii.tech' + '/pavii-social-preview-v2.png',
          },
        },
      ],
    }),
    mdx(),
  ],
  experimental: {
    clientPrerender: true,
  },
  vite: {
    plugins: [tailwindcss()],
  },
});
