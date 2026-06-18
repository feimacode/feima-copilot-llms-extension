// @ts-check
import { defineConfig } from 'astro/config';
import starlight from '@astrojs/starlight';

// BUILD_LOCALE controls the language of the build:
//   'en'       → English-only (single-locale build)
//   'zh'       → Chinese-only (single-locale build, uses src-zh)
//   undefined  → Bilingual (default for local dev & GitHub Pages)
const buildLocale = process.env.BUILD_LOCALE;
const isZh = buildLocale === 'zh';
const isEn = buildLocale === 'en';

// For the ZH build, Chinese content lives in src-zh/content/docs (symlinked from
// src/content/docs/zh) so it can be served as the root locale (no /zh/ prefix).
// For EN and bilingual builds, src/ is used with English at root and zh/ for Chinese.
const srcDir = isZh ? './src-zh' : './src';

// Build locales object without optional undefined properties
/** @type {Record<string, { label: string; lang: string }>} */
let locales;
if (isZh) {
  locales = { root: { label: '简体中文', lang: 'zh-CN' } };
} else if (isEn) {
  locales = { root: { label: 'English', lang: 'en' } };
} else {
  locales = { root: { label: 'English', lang: 'en' }, zh: { label: '简体中文', lang: 'zh-CN' } };
}

// ── Sidebar ──────────────────────────────────────────────────────────────────
// Starlight sidebar is a single flat array. For i18n, use `translations` on each
// item and `slug` instead of `link` for internal pages — Starlight auto-resolves
// the correct locale prefix from the slug.
// When BUILD_LOCALE is set, we use the locale-specific sidebar directly.
// In bilingual mode, we use a unified sidebar with translations.

// Bilingual sidebar: single flat array with translations.
// VS Code Copilot items use `slug` — they only exist in zh/ content, so Starlight
// automatically shows them in the ZH locale and hides them in the EN locale.
const sidebarBilingual = [
  {
    label: 'Start Here',
    translations: { 'zh-CN': '从这里开始' },
    collapsed: false,
    items: [
      { slug: 'index', translations: { 'zh-CN': '简介' } },
      { slug: 'guides/quickstart' },
      { slug: 'guides/installation' },
    ],
  },
  {
    label: 'User Guide',
    translations: { 'zh-CN': '用户指南' },
    items: [
      { slug: 'guides/authentication' },
      { slug: 'guides/api-keys' },
      { slug: 'guides/using-models' },
      { slug: 'guides/configuration' },
      { slug: 'guides/billing' },
      { slug: 'guides/faq' },
    ],
  },
  {
    label: 'API Tools',
    translations: { 'zh-CN': 'API 工具' },
    items: [
      { slug: 'guides/api-tool-guides' },
      { slug: 'guides/api-code-examples' },
    ],
  },
  {
    label: 'VS Code Copilot',
    translations: { 'zh-CN': 'VS Code Copilot 指南' },
    collapsed: true,
    items: [
      { label: 'Overview', translations: { 'zh-CN': 'GitHub Copilot 概览' }, link: '/zh/vscode-copilot/overview/' },
      { label: 'Setup', translations: { 'zh-CN': '设置 GitHub Copilot' }, link: '/zh/vscode-copilot/setup/' },
      { label: 'Getting Started', translations: { 'zh-CN': '快速入门教程' }, link: '/zh/vscode-copilot/getting-started/' },
      { label: 'Inline Suggestions', translations: { 'zh-CN': 'AI 驱动的内联建议' }, link: '/zh/vscode-copilot/inline-suggestions/' },
      { label: 'Smart Actions', translations: { 'zh-CN': '智能操作' }, link: '/zh/vscode-copilot/smart-actions/' },
      { label: 'Agents App', translations: { 'zh-CN': 'Agents 应用' }, link: '/zh/vscode-copilot/agents-app/' },
      { label: 'Best Practices', translations: { 'zh-CN': '最佳实践' }, link: '/zh/vscode-copilot/best-practices/' },
      {
        label: 'Agents',
        translations: { 'zh-CN': '智能体 (Agent)' },
        collapsed: true,
        items: [
          { label: 'Overview', translations: { 'zh-CN': '智能体概览' }, link: '/zh/vscode-copilot/agents/overview/' },
          { label: 'Tutorial', translations: { 'zh-CN': '智能体教程' }, link: '/zh/vscode-copilot/agents/agents-tutorial/' },
          { label: 'Local Agents', translations: { 'zh-CN': '本地智能体' }, link: '/zh/vscode-copilot/agents/local-agents/' },
          { label: 'Planning', translations: { 'zh-CN': '使用 Plan 智能体规划' }, link: '/zh/vscode-copilot/agents/planning/' },
          { label: 'Cloud Agents', translations: { 'zh-CN': '云端智能体' }, link: '/zh/vscode-copilot/agents/cloud-agents/' },
          { label: 'Copilot CLI', translations: { 'zh-CN': 'Copilot CLI（后台智能体）' }, link: '/zh/vscode-copilot/agents/copilot-cli/' },
          { label: 'Third-party Agents', translations: { 'zh-CN': '第三方智能体' }, link: '/zh/vscode-copilot/agents/third-party-agents/' },
        ],
      },
      {
        label: 'Chat',
        translations: { 'zh-CN': '聊天 (Chat)' },
        collapsed: true,
        items: [
          { label: 'Chat View', translations: { 'zh-CN': '聊天视图' }, link: '/zh/vscode-copilot/chat/chat-view/' },
          { label: 'Agent Mode', translations: { 'zh-CN': '智能体模式' }, link: '/zh/vscode-copilot/chat/agent-mode/' },
          { label: 'Ask Mode', translations: { 'zh-CN': 'Ask 模式' }, link: '/zh/vscode-copilot/chat/ask-mode/' },
          { label: 'Edit Mode', translations: { 'zh-CN': '编辑模式' }, link: '/zh/vscode-copilot/chat/edit-mode/' },
          { label: 'Inline Chat', translations: { 'zh-CN': '内联聊天' }, link: '/zh/vscode-copilot/chat/inline-chat/' },
          { label: 'Context', translations: { 'zh-CN': '聊天上下文' }, link: '/zh/vscode-copilot/chat/context/' },
          { label: 'Chat Sessions', translations: { 'zh-CN': '管理聊天会话' }, link: '/zh/vscode-copilot/chat/chat-sessions/' },
          { label: 'Prompt Crafting', translations: { 'zh-CN': '优化 AI 提示词' }, link: '/zh/vscode-copilot/chat/prompt-crafting/' },
        ],
      },
      {
        label: 'Customization',
        translations: { 'zh-CN': '自定义 (Customization)' },
        collapsed: true,
        items: [
          { label: 'Overview', translations: { 'zh-CN': '自定义概览' }, link: '/zh/vscode-copilot/customization/overview/' },
          { label: 'Custom Instructions', translations: { 'zh-CN': '自定义说明' }, link: '/zh/vscode-copilot/customization/custom-instructions/' },
          { label: 'Custom Agents', translations: { 'zh-CN': '自定义智能体' }, link: '/zh/vscode-copilot/customization/custom-agents/' },
          { label: 'Agent Skills', translations: { 'zh-CN': '智能体技能' }, link: '/zh/vscode-copilot/customization/agent-skills/' },
          { label: 'MCP Servers', translations: { 'zh-CN': 'MCP 服务器' }, link: '/zh/vscode-copilot/customization/mcp-servers/' },
          { label: 'Hooks', translations: { 'zh-CN': 'Hooks（钩子）' }, link: '/zh/vscode-copilot/customization/hooks/' },
          { label: 'Model Selection', translations: { 'zh-CN': '模型选择' }, link: '/zh/vscode-copilot/customization/model-selection/' },
        ],
      },
      {
        label: 'Concepts',
        translations: { 'zh-CN': '概念 (Concepts)' },
        collapsed: true,
        items: [
          { label: 'AI Features', translations: { 'zh-CN': 'AI 功能概述' }, link: '/zh/vscode-copilot/concepts/ai-features/' },
          { label: 'Language Models', translations: { 'zh-CN': '语言模型' }, link: '/zh/vscode-copilot/concepts/language-models/' },
          { label: 'Privacy', translations: { 'zh-CN': '隐私与数据处理' }, link: '/zh/vscode-copilot/concepts/privacy/' },
        ],
      },
      {
        label: 'Guides',
        translations: { 'zh-CN': '实战指南 (Guides)' },
        collapsed: true,
        items: [
          { label: 'Debug with Copilot', translations: { 'zh-CN': '使用 Copilot 调试' }, link: '/zh/vscode-copilot/guides/debug-with-copilot/' },
          { label: 'Fix Bugs', translations: { 'zh-CN': '修复 Bug' }, link: '/zh/vscode-copilot/guides/fix-bugs/' },
          { label: 'Generate Tests', translations: { 'zh-CN': '生成测试' }, link: '/zh/vscode-copilot/guides/generate-tests/' },
          { label: 'Prompt Engineering', translations: { 'zh-CN': '提示词工程指南' }, link: '/zh/vscode-copilot/guides/prompt-engineering/' },
          { label: 'Browser Agent Testing', translations: { 'zh-CN': '浏览器智能体测试' }, link: '/zh/vscode-copilot/guides/browser-agent-testing-guide/' },
        ],
      },
      {
        label: 'Reference',
        translations: { 'zh-CN': '参考 (Reference)' },
        collapsed: true,
        items: [
          { label: 'Slash Commands', translations: { 'zh-CN': '斜杠命令参考' }, link: '/zh/vscode-copilot/reference/slash-commands/' },
          { label: 'Context Variables', translations: { 'zh-CN': '上下文变量参考' }, link: '/zh/vscode-copilot/reference/context-variables/' },
          { label: 'Copilot Settings', translations: { 'zh-CN': 'Copilot 设置参考' }, link: '/zh/vscode-copilot/reference/copilot-settings/' },
        ],
      },
      { label: 'Security & Privacy', translations: { 'zh-CN': 'AI 安全与隐私' }, link: '/zh/vscode-copilot/security/' },
      { label: 'Troubleshooting', translations: { 'zh-CN': '故障排查' }, link: '/zh/vscode-copilot/troubleshooting/' },
      { label: 'FAQ', translations: { 'zh-CN': '常见问题（FAQ）' }, link: '/zh/vscode-copilot/faq/' },
    ],
  },
  {
    label: 'Development',
    translations: { 'zh-CN': '开发' },
    items: [
      { slug: 'dev/setup' },
      { slug: 'dev/testing' },
      { slug: 'dev/building' },
    ],
  },
  {
    label: 'Reference',
    translations: { 'zh-CN': '参考' },
    items: [
      { slug: 'reference/api' },
      { slug: 'reference/config' },
    ],
  },
];

// Single-locale sidebars (used when BUILD_LOCALE is set)
const sidebarEnOnly = [
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
      { label: 'API Keys', link: '/guides/api-keys' },
      { label: 'Using Models', link: '/guides/using-models' },
      { label: 'Configuration', link: '/guides/configuration' },
      { label: 'Billing', link: '/guides/billing' },
      { label: 'FAQ', link: '/guides/faq' },
    ],
  },
  {
    label: 'API Tools',
    items: [
      { label: 'API Tool Guides', link: '/guides/api-tool-guides' },
      { label: 'API Code Examples', link: '/guides/api-code-examples' },
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
      { label: 'API Reference', link: '/reference/api' },
      { label: 'Config Reference', link: '/reference/config' },
    ],
  },
];

const sidebarZhOnly = [
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
      { label: 'API 密钥', link: '/guides/api-keys' },
      { label: '使用模型', link: '/guides/using-models' },
      { label: '配置', link: '/guides/configuration' },
      { label: '计费', link: '/guides/billing' },
      { label: '常见问题', link: '/guides/faq' },
    ],
  },
  {
    label: 'API 工具',
    items: [
      { label: 'API 工具指南', link: '/guides/api-tool-guides' },
      { label: 'API 代码示例', link: '/guides/api-code-examples' },
    ],
  },
  {
    label: 'VS Code Copilot 指南',
    collapsed: true,
    items: [
      { label: 'GitHub Copilot 概览', link: '/vscode-copilot/overview' },
      { label: '设置 GitHub Copilot', link: '/vscode-copilot/setup' },
      { label: '快速入门教程', link: '/vscode-copilot/getting-started' },
      { label: 'AI 驱动的内联建议', link: '/vscode-copilot/inline-suggestions' },
      { label: '智能操作', link: '/vscode-copilot/smart-actions' },
      { label: 'Agents 应用', link: '/vscode-copilot/agents-app' },
      { label: '最佳实践', link: '/vscode-copilot/best-practices' },
      {
        label: '智能体 (Agent)',
        collapsed: true,
        items: [
          { label: '智能体概览', link: '/vscode-copilot/agents/overview' },
          { label: '智能体教程', link: '/vscode-copilot/agents/agents-tutorial' },
          { label: '本地智能体', link: '/vscode-copilot/agents/local-agents' },
          { label: '使用 Plan 智能体规划', link: '/vscode-copilot/agents/planning' },
          { label: '云端智能体', link: '/vscode-copilot/agents/cloud-agents' },
          { label: 'Copilot CLI（后台智能体）', link: '/vscode-copilot/agents/copilot-cli' },
          { label: '第三方智能体', link: '/vscode-copilot/agents/third-party-agents' },
        ],
      },
      {
        label: '聊天 (Chat)',
        collapsed: true,
        items: [
          { label: '聊天视图', link: '/vscode-copilot/chat/chat-view' },
          { label: '智能体模式', link: '/vscode-copilot/chat/agent-mode' },
          { label: 'Ask 模式', link: '/vscode-copilot/chat/ask-mode' },
          { label: '编辑模式', link: '/vscode-copilot/chat/edit-mode' },
          { label: '内联聊天', link: '/vscode-copilot/chat/inline-chat' },
          { label: '聊天上下文', link: '/vscode-copilot/chat/context' },
          { label: '管理聊天会话', link: '/vscode-copilot/chat/chat-sessions' },
          { label: '优化 AI 提示词', link: '/vscode-copilot/chat/prompt-crafting' },
        ],
      },
      {
        label: '自定义 (Customization)',
        collapsed: true,
        items: [
          { label: '自定义概览', link: '/vscode-copilot/customization/overview' },
          { label: '自定义说明', link: '/vscode-copilot/customization/custom-instructions' },
          { label: '自定义智能体', link: '/vscode-copilot/customization/custom-agents' },
          { label: '智能体技能', link: '/vscode-copilot/customization/agent-skills' },
          { label: 'MCP 服务器', link: '/vscode-copilot/customization/mcp-servers' },
          { label: 'Hooks（钩子）', link: '/vscode-copilot/customization/hooks' },
          { label: '模型选择', link: '/vscode-copilot/customization/model-selection' },
        ],
      },
      {
        label: '概念 (Concepts)',
        collapsed: true,
        items: [
          { label: 'AI 功能概述', link: '/vscode-copilot/concepts/ai-features' },
          { label: '语言模型', link: '/vscode-copilot/concepts/language-models' },
          { label: '隐私与数据处理', link: '/vscode-copilot/concepts/privacy' },
        ],
      },
      {
        label: '实战指南 (Guides)',
        collapsed: true,
        items: [
          { label: '使用 Copilot 调试', link: '/vscode-copilot/guides/debug-with-copilot' },
          { label: '修复 Bug', link: '/vscode-copilot/guides/fix-bugs' },
          { label: '生成测试', link: '/vscode-copilot/guides/generate-tests' },
          { label: '提示词工程指南', link: '/vscode-copilot/guides/prompt-engineering' },
          { label: '浏览器智能体测试', link: '/vscode-copilot/guides/browser-agent-testing-guide' },
        ],
      },
      {
        label: '参考 (Reference)',
        collapsed: true,
        items: [
          { label: '斜杠命令参考', link: '/vscode-copilot/reference/slash-commands' },
          { label: '上下文变量参考', link: '/vscode-copilot/reference/context-variables' },
          { label: 'Copilot 设置参考', link: '/vscode-copilot/reference/copilot-settings' },
        ],
      },
      { label: 'AI 安全与隐私', link: '/vscode-copilot/security' },
      { label: '故障排查', link: '/vscode-copilot/troubleshooting' },
      { label: '常见问题（FAQ）', link: '/vscode-copilot/faq' },
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

// Select sidebar based on build mode
const sidebar = isZh ? sidebarZhOnly : isEn ? sidebarEnOnly : sidebarBilingual;

export default defineConfig({
  output: 'static',
  outDir: './dist',
  srcDir,
  trailingSlash: 'always',
  build: {
    format: 'directory',
  },

  integrations: [
    starlight({
      title: isZh ? '飞码扣文档' : 'Feima Copilot Docs',
      description: isZh
        ? '为 GitHub Copilot 提供中国 AI 模型支持的 VS Code 扩展文档'
        : 'VS Code extension for GitHub Copilot with China AI model support',

      locales,
      defaultLocale: 'root',

      sidebar,

      social: [
        {
          icon: 'github',
          label: 'GitHub',
          href: 'https://github.com/feimacode/feima-copilot-llms-extension',
        },
      ],
      editLink: {
        baseUrl: 'https://github.com/feimacode/feima-copilot-llms-extension/edit/main',
      },
      lastUpdated: true,
    }),
  ],

  site: process.env.SITE_URL ?? 'https://docs.feimacode.com',
  base: process.env.BASE_PATH ?? '/',
});
