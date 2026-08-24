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
  // GFM tables in the docs MDX did not parse without this (rendered as
  // literal pipes); the template never used tables so it was never set.
  markdown: { gfm: true },
  integrations: [
    sitemap({
      // The docs are real product pages now (see the starlight block below),
      // so nothing is filtered out of the sitemap any more.
      i18n: {
        defaultLocale: 'en', // All urls that don't contain language prefix will be treated as default locale
        locales: {
          en: 'en', // The `defaultLocale` value must present in `locales` keys
          fr: 'fr',
        },
      },
    }),
    starlight({
      title: 'PAVii.AI Docs',
      // https://github.com/withastro/starlight/blob/main/packages/starlight/CHANGELOG.md
      // If no Astro and Starlight i18n configurations are provided, the built-in default locale is used in Starlight and a matching Astro i18n configuration is generated/used.
      // If only a Starlight i18n configuration is provided, an equivalent Astro i18n configuration is generated/used.
      // If only an Astro i18n configuration is provided, the Starlight i18n configuration is updated to match it.
      // If both an Astro and Starlight i18n configurations are provided, an error is thrown.
      // English-only, like the rest of the site. The old 6-locale setup
      // served machine-translated ScrewFast boilerplate and nothing else.
      locales: {
        root: {
          label: 'English',
          lang: 'en',
        },
      },
      // https://starlight.astro.build/guides/sidebar/
      sidebar: [
        {
          label: 'Getting Started',
          items: [{ autogenerate: { directory: 'products/dev-tools/docs/getting-started' } }],
        },
        {
          label: 'Features',
          items: [{ autogenerate: { directory: 'products/dev-tools/docs/features' } }],
        },
        {
          label: 'Guides',
          items: [{ autogenerate: { directory: 'products/dev-tools/docs/guides' } }],
        },
        {
          label: 'Advanced',
          items: [{ autogenerate: { directory: 'products/dev-tools/docs/advanced' } }],
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
