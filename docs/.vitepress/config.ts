import { defineConfig } from "vitepress";

export default defineConfig({
  base: "/storage-kit/",
  title: "Storage Kit",
  description:
    "A unified, framework-agnostic storage service for S3-compatible providers",
  themeConfig: {
    nav: [
      { text: "Home", link: "/" },
      { text: "Guide", link: "/guide/introduction" },
      { text: "API", link: "/api/" },
      { text: "Examples", link: "/frameworks/express" },
    ],

    sidebar: {
      "/api/": [
        {
          text: "API Reference",
          items: [
            { text: "StorageClient", link: "/api/" },
            { text: "Providers", link: "/api/providers" },
          ],
        },
      ],
      "/": [
        {
          text: "Introduction",
          items: [
            { text: "What is Storage Kit?", link: "/guide/introduction" },
            { text: "Installation", link: "/guide/installation" },
            { text: "Core Concepts", link: "/guide/concepts" },
            { text: "Multi-Provider", link: "/guide/multi-provider" },
          ],
        },
        {
          text: "Framework Integration",
          items: [
            { text: "Next.js", link: "/frameworks/nextjs" },
            { text: "Fastify", link: "/frameworks/fastify" },
            { text: "Express", link: "/frameworks/express" },
            { text: "Hono", link: "/frameworks/hono" },
            { text: "NestJS", link: "/frameworks/nestjs" },
          ],
        },
      ],
    },

    socialLinks: [
      { icon: "github", link: "https://github.com/Tranthanh98/storage-kit" },
    ],

    footer: {
      message: "Released under the MIT License.",
      copyright: "Copyright © 2024-present",
    },
  },
});
