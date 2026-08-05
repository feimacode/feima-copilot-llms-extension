---
title: Utility Model Configuration
description: Configure utility models for BYOK setups to avoid errors with Feima Copilot
head:
  - tag: script
    attrs:
      type: application/ld+json
    content: |
      {
        "@context": "https://schema.org",
        "@type": "Article",
        "headline": "Utility Model Configuration for Feima Copilot",
        "description": "Learn how to configure utility models when using BYOK models with Feima Copilot",
        "author": {
          "@type": "Organization",
          "name": "Feimacode",
          "url": "https://feimacode.com"
        }
      }
---

# Utility Model Configuration

When you use Feima's models (or any BYOK — Bring Your Own Key — models) as your main agent model in GitHub Copilot, you may encounter this error:

> No utility model is configured for 'copilot-utility-small' while the selected main agent model is BYOK.

This happens because VS Code Copilot uses **utility models** for background tasks that run alongside your main conversation. These tasks are not handled by your selected chat model — they use separate, internal models.

## What Are Utility Models?

GitHub Copilot uses two types of utility models behind the scenes:

| Utility Model | Purpose |
|---------------|---------|
| **Utility Model** (`copilot-utility`) | General background flows: chat titles, session summaries, tool-calling orchestration, prompt rendering, search panel intents |
| **Utility Small Model** (`copilot-utility-small`) | Fast/cheap background flows: commit messages, intent detection, inline-chat progress messages, terminal fix generation, rename suggestions, semantic search, MCP tool calling, background todo agent, debugging start, workspace generation |

When your main agent model is a **Copilot-provided model**, these utility flows automatically use Copilot's own utility models. But when your main model is a **BYOK model** (like Feima's models), Copilot doesn't know which model to use for these background tasks.

## The Three Settings You Need to Know

### 1. `chat.byokUtilityModelDefault` (Default Behavior)

Controls what happens when no explicit utility model override is set.

| Value | Behavior |
|-------|----------|
| `none` (default) | No default utility model — **this causes the error** |
| `mainAgent` | Use your selected BYOK main agent model for all utility flows |
| `copilot` | Use GitHub Copilot's default utility models (requires Copilot subscription) |

```json
{
  "chat.byokUtilityModelDefault": "mainAgent"
}
```

### 2. `chat.utilityModel` (Explicit Override)

Overrides the model used for general utility flows. Set this to pick a specific model for tasks like title generation, summaries, and tool orchestration.

Format: `vendor/model-id` (e.g., `feima/deepseek-v4-flash`)

```json
{
  "chat.utilityModel": "feima/deepseek-v4-flash"
}
```

### 3. `chat.utilitySmallModel` (Explicit Override)

Overrides the model used for small/fast utility flows. A fast and inexpensive model is recommended here, as these calls happen frequently in the background.

Format: `vendor/model-id` (e.g., `feima/deepseek-v4-flash`)

```json
{
  "chat.utilitySmallModel": "feima/deepseek-v4-flash"
}
```

## Resolution Order

When Copilot needs a utility model, it resolves it in this order:

1. **Explicit override** — `chat.utilityModel` / `chat.utilitySmallModel` (if set)
2. **BYOK default** — `chat.byokUtilityModelDefault` (if main agent is BYOK)
3. **Copilot built-in** — Default Copilot utility models (if main agent is Copilot)

## Recommended Configuration

### Option A: Use Your Feima Model for Everything (Simplest)

Set the BYOK default to use your main agent model:

```json
{
  "chat.byokUtilityModelDefault": "mainAgent"
}
```

This makes all utility flows use the same model you selected for chat. It's the simplest setup and works with any Feima model.

**Pros**: No extra configuration needed per model change.
**Cons**: Utility tasks may be slower or more expensive with large models.

### Option B: Use a Fast Model for Utility Tasks (Cost-Effective)

Explicitly set a fast, inexpensive model for utility flows:

```json
{
  "chat.utilityModel": "feima/deepseek-v4-flash",
  "chat.utilitySmallModel": "feima/deepseek-v4-flash"
}
```

**Pros**: Fast and cost-effective for background tasks.
**Cons**: Need to update if you change model providers.

### Option C: Use Copilot for Utility Tasks (If You Have Copilot)

```json
{
  "chat.byokUtilityModelDefault": "copilot"
}
```

**Pros**: Uses Copilot's optimized utility models.
**Cons**: Requires an active GitHub Copilot subscription.

## Recommended Feima Models for Utility Tasks

For utility flows, we recommend fast, cost-effective models:

| Model | Best For | Why |
|-------|----------|-----|
| `feima/deepseek-v4-flash` | All utility tasks | Fast, free tier, thinking-capable |
| `feima/qwen-coder-turbo` | Code-related utility tasks | Optimized for code, free tier |
| `feima/glm-4.7` | General utility tasks | Fast, long output support |

## Troubleshooting

### Error: "No utility model is configured"

**Cause**: `chat.byokUtilityModelDefault` is set to `none` (the default) and no explicit `chat.utilityModel` or `chat.utilitySmallModel` is configured.

**Fix**: Set any of the three settings above. The simplest fix is:

```json
{
  "chat.byokUtilityModelDefault": "mainAgent"
}
```

### Utility tasks are slow

**Cause**: Using a large model (e.g., `qwen3.7-max`) for utility tasks.

**Fix**: Set `chat.utilitySmallModel` to a faster model:

```json
{
  "chat.utilitySmallModel": "feima/deepseek-v4-flash"
}
```

### Utility tasks consume too many credits

**Cause**: Using an expensive model for frequent background tasks.

**Fix**: Use a free-tier model for utility tasks:

```json
{
  "chat.utilityModel": "feima/deepseek-v4-flash",
  "chat.utilitySmallModel": "feima/deepseek-v4-flash"
}
```
