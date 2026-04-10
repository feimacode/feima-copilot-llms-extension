---
title: Billing & Pricing
description: Understand how Feima charges for AI requests and optimize your usage
---

# Billing & Pricing

Feima uses a weighted request-based billing model that considers both the AI model you use and the context size of your requests. This fair and transparent system ensures you pay for what you use.

## Billing Formula

Each request is calculated using a simple formula:

```
weighted_requests = model_multiplier × context_multiplier
```

The result is rounded to 2 decimal places.

### Example Calculations

| Model Tier | Context Size | Model Multiplier | Context Multiplier | Weighted Requests |
|------------|--------------|------------------|-------------------|-------------------|
| Ultra-Lightweight | Small (0-4K tokens) | 0.1x | 0.5x | 0.05 |
| Lightweight | Medium (4K-16K tokens) | 0.5x | 1.0x | 0.50 |
| Standard | Large (16K-32K tokens) | 1.0x | 1.5x | 1.50 |
| Premium | Extra Large (32K+ tokens) | 2.0x | 2.0x | 4.00 |

## Model Multipliers

Different AI models have different costs based on their capabilities and resource requirements:

### Ultra-Lightweight Models (0.1x)

**Examples**: Qwen3 Flash

- **Best For**: Ultra-fast code completion
- **Characteristics**: Extremely fast, minimal resource usage
- **Use When**: You need instant responses for very simple tasks

### Lightweight Models (0.5x)

**Examples**: Qwen3.5 Plus

- **Best For**: Code completion, simple code generation
- **Characteristics**: Fast, efficient, lower resource usage
- **Use When**: You need quick responses for straightforward tasks

### Standard Models (1.0x)

**Examples**: Qwen3 Max, DeepSeek V3.2, Kimi K2.5

- **Best For**: General Q&A, code understanding
- **Characteristics**: Balanced performance and cost
- **Use When**: Everyday coding tasks that don't require advanced reasoning

### Premium Models (2.0x)

**Examples**: Qwen3 Coder Plus, GLM-5

- **Best For**: Large codebase analysis, advanced reasoning
- **Characteristics**: State-of-the-art performance, maximum capabilities
- **Use When**: Critical tasks requiring the highest quality output

## Context Multipliers

Larger context windows require more computational resources:

| Context Size | Token Range | Multiplier |
|--------------|-------------|------------|
| Small | 0 - 4,000 tokens | 0.5x |
| Medium | 4,001 - 16,000 tokens | 1.0x |
| Large | 16,001 - 32,000 tokens | 1.5x |
| Extra Large | 32,001+ tokens | 2.0x |

### What Are Tokens?

Tokens are the basic units of text that AI models process:

- **English**: Roughly 1 token ≈ 4 characters or ¾ of a word
- **Chinese**: Roughly 1 token ≈ 1-2 characters
- **Code**: Tokens vary depending on the programming language and syntax

**Example**: The phrase "Hello, world!" is approximately 4 tokens.

## Cost Optimization Tips

### 1. Use Lightweight Models for Simple Tasks

```markdown
# Good: Use lightweight model for simple completion
"Complete this function: def calculate_sum(a, b):"

# Avoid: Using premium model for the same task
```

### 2. Keep Context Focused and Concise

```markdown
# Good: Focused context
"Review this function for bugs: [paste 20 lines of code]"

# Avoid: Including entire file when only function is needed
```

### 3. Choose Standard Models for Everyday Coding

Most everyday tasks work well with standard models. Reserve advanced and premium models for:

- Complex algorithm design
- Architecture decisions
- Code review of critical systems
- Large-scale refactoring

### 4. Monitor Your Usage

Check your balance regularly:

1. Click the Feima status bar item
2. View your remaining requests
3. Review your transaction history in the [web dashboard](https://feimacode.com/profile)

## Viewing Your Balance

### In VS Code

1. Look at the status bar for your remaining requests
2. Click the status bar item for detailed information
3. Sign in to view your full account details

### On the Web

1. Visit [feimacode.com/profile](https://feimacode.com/profile)
2. View your wallet balance and transaction history
3. See your earned credits and expiration dates

## Billing Examples

### Example 1: Code Completion

**Scenario**: Using Qwen Turbo Lite to complete a function

- **Model**: Qwen Turbo Lite (ultra-lightweight, 0.1x)
- **Context**: 2,000 tokens (small, 0.5x)
- **Calculation**: 0.1 × 0.5 = **0.05 weighted requests**

### Example 2: Code Review

**Scenario**: Using Qwen3 Max to review a complex function

- **Model**: Qwen3 Max (standard, 1.0x)
- **Context**: 8,000 tokens (medium, 1.0x)
- **Calculation**: 1.0 × 1.0 = **1.00 weighted requests**

### Example 3: Large Codebase Analysis

**Scenario**: Using Qwen3 Coder Plus to analyze an entire module

- **Model**: Qwen3 Coder Plus (premium, 2.0x)
- **Context**: 50,000 tokens (extra large, 2.0x)
- **Calculation**: 2.0 × 2.0 = **4.00 weighted requests**

## FAQ

### How do I check my current balance?

You can view your balance and transaction history in your Profile page on the [Feima website](https://feimacode.com/profile) after signing in.

### Do context brackets change?

Context bracket configurations may be adjusted periodically to reflect computational costs. Check this page for the latest information.

### Which model should I use?

Start with standard models for most tasks. Use lightweight models for simple tasks, and premium models only when you need the highest quality output.

### How are tokens counted?

Tokens are counted based on the total input and output of your request. Input includes your prompt and any context you provide. Output is the model's response.

### Can I see my billing history?

Yes, you can view your complete billing history on the [Feima website](https://feimacode.com/profile), including:
- Transaction timestamps
- Model used
- Token counts
- Weighted request costs

## Getting More Requests

### Referral Program

Invite friends to use Feima and both of you earn free requests:

1. Get your unique referral link from your [Profile page](https://feimacode.com/profile/referrals)
2. Share the link with friends
3. When they sign up and install the extension, you both get rewards

### Promotional Offers

Check the [Promotion page](https://feimacode.com/promotion) for current offers and opportunities to earn free requests.


## Support

If you have questions about billing or need help with your account:

- Visit the [Feima website](https://feimacode.com)
- Check the [FAQ section](https://feimacode.com/pricing)
- Contact support through your [Profile page](https://feimacode.com/profile)