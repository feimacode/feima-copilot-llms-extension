// @ts-check
import { defineConfig } from 'astro/config';
import starlight from '@astrojs/starlight';

// BUILD_LOCALE controls the language of the build:
//   'en'       → English-only (GitHub Pages)
//   'zh'       → Chinese-only (Alibaba OSS)
//   undefined  → Bilingual (local dev default)
const buildLocale = process.env.BUILD_LOCALE;
const isZh = buildLocale === 'zh';
const isEn = buildLocale === 'en';

// For the ZH build, Chinese content lives in src-zh/content/docs (symlinked from
// src/content/docs/zh) so it can be served as the root locale (no /zh/ prefix).
// For EN and bilingual builds, src/ is used with English at root and zh/ for Chinese.
const srcDir = isZh ? './src-zh' : './src';

const locales = isZh
  ? { root: { label: '简体中文', lang: 'zh-CN' } }
  : isEn
    ? { root: { label: 'English', lang: 'en' } }
    : { root: { label: 'English', lang: 'en' }, zh: { label: '简体中文', lang: 'zh-CN' } };

const sidebarEn = [
  {
    label: 'Start Here',
    collapsed: false,
    items: [
      { label: 'Introduction', link: '/' },
      { label: 'Quick Start', link: '/guides/quickstart' },
      { label: 'Installation', link: '/guides/installation' },
    ],
  },
  {
    label: 'User Guide',
    items: [
      { label: 'Authentication', link: '/guides/authentication' },
      { label: 'Using Models', link: '/guides/using-models' },
      { label: 'Configuration', link: '/guides/configuration' },
    ],
  },
  {
    label: 'Development',
    items: [
      { label: 'Dev Setup', link: '/dev/setup' },
      { label: 'Testing', link: '/dev/testing' },
      { label: 'Building', link: '/dev/building' },
    ],
  },
  {
    label: 'Reference',
    items: [
      { label: 'Supported Models', link: '/reference/models' },
      { label: 'API Reference', link: '/reference/api' },
      { label: 'Config Reference', link: '/reference/config' },
    ],
  },
];

const sidebarZh = [
  {
    label: '从这里开始',
    collapsed: false,
    items: [
      { label: '简介', link: '/' },
      { label: '快速入门', link: '/guides/quickstart' },
      { label: '安装', link: '/guides/installation' },
    ],
  },
  {
    label: '用户指南',
    items: [
      { label: '认证', link: '/guides/authentication' },
      { label: '使用模型', link: '/guides/using-models' },
      { label: '配置', link: '/guides/configuration' },
    ],
  },
  {
    label: '开发',
    items: [
      { label: '开发设置', link: '/dev/setup' },
      { label: '测试', link: '/dev/testing' },
      { label: '构建', link: '/dev/building' },
    ],
  },
  {
    label: '参考',
    items: [
      { label: 'API 参考', link: '/reference/api' },
      { label: '配置参考', link: '/reference/config' },
    ],
  },
];

export default defineConfig({
  output: 'static',
  outDir: './dist',
  srcDir,
  trailingSlash: 'never',
  build: {
    format: 'file',   // output guides/quickstart.html instead of guides/quickstart/index.html
  },

  integrations: [
    starlight({
      title: isZh ? '飞码扣文档' : 'Feima Copilot Docs',
      description: isZh
        ? '为 GitHub Copilot 提供中国 AI 模型支持的 VS Code 扩展文档'
        : 'VS Code extension for GitHub Copilot with China AI model support',

      locales,
      defaultLocale: 'root',

      // Bilingual build: use both sidebar sets keyed by locale
      // Single-language builds: use the matching sidebar
      sidebar: isZh ? sidebarZh : sidebarEn,

      social: [
        {
          icon: 'github',
          label: 'GitHub',
          ariaLabel: 'GitHub Repository',
          href: 'https://github.com/feimacode/feima-copilot-llms-extension',
        },
      ],
      editLink: {
        baseUrl: 'https://github.com/feimacode/feima-copilot-llms-extension/edit/main',
      },
      lastUpdated: true,
    }),
  ],

  site: process.env.SITE_URL ?? 'https://ivenxu.github.io',
  base: process.env.BASE_PATH ?? '/feima-copilot-llms-extension',
});
