// @ts-check
// Note: type annotations allow type checking and IDEs autocompletion

import 'dotenv/config';

/** @type {import('@docusaurus/types').Config} */
const config = {
  title: "Enscribe",
  tagline: "Smart contract identity and naming infrastructure for Ethereum",
  favicon: "img/favicon.ico",

  url: "https://www.enscribe.xyz",
  baseUrl: "/",

  trailingSlash: false,

  // GitHub pages deployment config
  organizationName: "enscribexyz",
  projectName: "enscribe",

  onBrokenLinks: "throw",

  // Even if you don't use internalization, you can use this field to set useful
  // metadata like html lang. For example, if your site is Chinese, you may want
  // to replace "en" with "zh-Hans".
  i18n: {
    defaultLocale: "en",
    locales: ["en"],
  },

  plugins: [
    async function tailwindPlugin(context, options) {
      return {
        name: "tailwind-plugin",
        configurePostCss(postcssOptions) {
          postcssOptions.plugins.push(require("@tailwindcss/postcss"))
          return postcssOptions
        },
      }
    },
    'docusaurus-plugin-image-zoom',
    require.resolve('./src/plugins/related-posts'),
     [
       '@docusaurus/plugin-content-docs',
       {
         id: 'guides',
         path: 'guides',
         routeBasePath: 'guides',
         sidebarPath: require.resolve('./guides-sidebars.ts'),
         sidebarCollapsed: false,
         editUrl: 'https://github.com/enscribexyz/enscribe/tree/main/docs',
       },
     ],
     [
       '@docusaurus/plugin-content-docs',
       {
         id: 'api',
         path: 'api',
         routeBasePath: 'api',
         sidebarPath: require.resolve('./api-sidebars.ts'),
         docItemComponent: '@theme/ApiItem',
         editUrl: 'https://github.com/enscribexyz/enscribe/tree/main/docs',
       },
     ],
     [
       'docusaurus-plugin-openapi-docs',
       {
         id: 'api',
         docsPluginId: 'api',
         config: {
           enscribe: {
             specPath: 'openapi/enscribe.yaml',
             outputDir: 'api',
             showSchemas: true,
             sidebarOptions: {
               groupPathsBy: 'tag',
               categoryLinkSource: 'tag',
               sidebarCollapsed: false,
             },
           },
         },
       },
     ],
  ],

  markdown: {
    mermaid: true,
    hooks: {
      onBrokenMarkdownLinks: "warn",
    },
  },
  themes: ['@docusaurus/theme-mermaid', 'docusaurus-theme-openapi-docs'],

  presets: [
    [
      "classic",
      /** @type {import('@docusaurus/preset-classic').Options} */
      ({
        docs: {
          sidebarPath: require.resolve("./sidebars.js"),
          editUrl:
            'https://github.com/enscribexyz/enscribe/tree/main/docs',
        },
        blog: {
          showReadingTime: true,
          postsPerPage: 9,
          blogSidebarCount: 0,
          onInlineTags: 'ignore',
          onUntruncatedBlogPosts: 'ignore',
          feedOptions: {
            type: ["rss", "atom", "json"],
            copyright: `Copyright © ${new Date().getFullYear()} Web3 Labs Ltd.`,
          },
        },
        theme: {
          customCss: require.resolve("./src/css/custom.css"),
        },
        gtag: {
          trackingID: 'G-190T6LGDNH',
          anonymizeIP: true,
        },
        sitemap: {
          ignorePatterns: [
            '/blog/tags/**',
            '/blog/page/**',
          ],
        }
      }),
    ],
  ],

  customFields: {
    // Put your custom environment here
    appUrl: process.env.APP_URL,
    formspreeUrl: process.env.FORMSPREE_URL,
    calendarUrl: 'https://calendar.app.google/J1xEJA4Hr3GBqJ4K8',
  },

  themeConfig:
    /** @type {import('@docusaurus/preset-classic').ThemeConfig} */
    ({
      // Replace with your project's social card
      image: "img/social-card.png",

      metadata: [
        { name: 'keywords', content: 'smart contract naming, smart contract identity, ENS, Ethereum Name Service, Ethereum smart contracts, ENS smart contract naming, protocol infrastructure, smart contract naming audits, naming audits, Enscribe' },
        { name: 'description', content: 'Enscribe provides infrastructure for naming and managing smart contracts and wallets using ENS.' },
        { name: 'twitter:card', content: 'summary_large_image' },
        { name: 'twitter:image', content: 'https://www.enscribe.xyz/img/social-card.png' },
        { property: 'og:image', content: 'https://www.enscribe.xyz/img/social-card.png' },
        { property: 'og:title', content: 'Smart contract identity and naming infrastructure for Ethereum | Enscribe' },
        { property: 'og:description', content: 'Enscribe provides infrastructure for naming and managing smart contracts and wallets using ENS.' },
      ],

      headTags: [
        {
          tagName: 'link',
          attributes: {
            rel: 'preconnect',
            href: 'https://www.enscribe.xyz/',
          },
        },
        {
          tagName: 'script',
          attributes: {
            type: 'application/ld+json',
          },
          innerHTML: JSON.stringify({
            '@context': 'https://schema.org/',
            '@type': 'Organization',
            name: 'Enscribe',
            url: 'https://www.enscribe.xyz/',
            logo: 'https://www.enscribe.xyz/img/logo.svg',
          }),
        },
      ],

      navbar: {
        title: "Enscribe",
        logo: {
          alt: "Enscribe Logo",
          src: "img/logo.svg",
        },
        items: [
          {
            type: "docSidebar",
            sidebarId: "docsSidebar",
            position: "left",
            label: "Docs",
          },
          {
            type: "docSidebar",
            sidebarId: "guidesSidebar",
            position: "left",
            label: "Guides",
            docsPluginId: "guides",
          },
          {
            type: "docSidebar",
            sidebarId: "apiSidebar",
            position: "left",
            label: "API",
            docsPluginId: "api",
          },
          { to: "/blog", label: "Blog", position: "left" },
          { to: "/audit", label: "Services", position: "left" },
          {
            href: "https://github.com/enscribexyz/enscribe",
            label: "GitHub",
            position: "right",
          },
        ],
      },
      algolia: {
        appId: 'FDHVY14O0W',

        apiKey: 'a16f9c245539783b5555ed92781838aa',

        indexName: 'enscribe',

        askAi: 'CPzOUStt6qk8',
      },
      api: {
        authPersistance: 'localStorage',
        requestTimeout: 60000,
      },
      footer: {
        style: "dark",
        links: [
          {
            title: "Docs",
            items: [
              {
                label: "Introduction",
                to: "/docs",
              },
              {
                label: "Getting Started",
                to: "/docs/getting-started",
              },
              {
                label: "Guides",
                to: "/guides",
              },
            ],
          },
          {
            title: "Community",
            items: [
              {
                label: "Telegram",
                href: "https://t.me/enscribers",
              },
              {
                label: "Discord",
                href: "https://discord.gg/8QUMMdS5GY",
              },
              {
                label: "X",
                href: "https://x.com/enscribe_",
              },
              {
                label: "YouTube",
                href: "https://www.youtube.com/@enscribexyz",
              },
              {
                label: "Farcaster",
                href: "https://warpcast.com/enscribe",
              },
            ],
          },
          {
            title: "More",
            items: [
              {
                label: "Blog",
                to: "/blog",
              },
              {
                label: "GitHub",
                href: "https://github.com/enscribexyz/enscribe",
              },
            ],
          },
        ],
        copyright: `Copyright © ${new Date().getFullYear()} Web3 Labs Ltd. All rights reserved.`,
      },
      prism: {
        theme: require("prism-react-renderer").themes.dracula,
        additionalLanguages: ['solidity'],
      },
      colorMode: {
        defaultMode: "dark",
        disableSwitch: false,
        respectPrefersColorScheme: false,
      },
      zoom: {
        selector: '.markdown img:not(em img)', // avoids zooming on emoji or inline images
        background: {
          light: 'rgba(255, 255, 255, 0.95)',
          dark: 'rgba(50, 50, 50, 0.95)'
        },
        config: {} // optional medium-zoom config
      }
    }),
}

module.exports = config
