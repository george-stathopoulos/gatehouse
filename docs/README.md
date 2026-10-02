# Gatehouse documentation

Gatehouse shows you every AI call your WordPress site makes. It tells you which plugin made each call and what it cost, lets you stop runaway spending, and keeps personal data out of the requests sent to AI providers.

![The Gatehouse overview](images/overview.png)

## Start here

- **[Try the live demo](https://george-stathopoulos.github.io/gatehouse/demo/)**: Gatehouse with three months of sample data, in your browser.

- **[Getting started](getting-started.md)**: requirements, installation, the setup guide, Connector Approval, demo data and the in-plugin Help.

## Using Gatehouse

| Page | What it covers |
|---|---|
| [Overview](overview.md) | The dashboard: spend, forecast, budget status, key numbers, charts and recent activity |
| [Sources and budgets](sources-and-budgets.md) | Every plugin and theme that uses AI: budgets, pausing, statuses and per-source options |
| [Requests](requests.md) | The log of every AI call, its filters and the detail panel |
| [Privacy and redaction](privacy.md) | How personal data is removed from prompts and put back in answers |
| [Brand brief](brand-brief.md) | One set of instructions added to every AI request |
| [Settings](settings.md) | Site-wide budget, alerts, logging, model prices and clearing data |
| [Gatehouse Pro: caching](pro.md) | The optional paid add-on that answers repeated requests from a cache |

## Reference

- **[How costs are calculated](costs-and-pricing.md)**: the cost formula, where prices come from and how they are updated.
- **[Private AI with WebLLM](local-ai.md)**: download, install and check the free in-browser AI provider.
- **[Your data](data.md)**: what Gatehouse stores, for how long, and what uninstalling removes.
- **[FAQ](faq.md)**
- **[Troubleshooting](troubleshooting.md)**
- **[For developers](developers.md)**: how the gateway works, filters, WP-CLI and the REST API.

## Gatehouse in one minute

1. A plugin asks WordPress for AI, for example to write a product description.
2. Gatehouse notes which plugin is asking. If that plugin is paused or over its budget, the request stops here, before anything is sent or charged.
3. Personal data in the prompt is replaced with placeholders such as `[EMAIL_1]`, and your brand brief is added to the instructions.
4. The AI provider answers. Gatehouse puts the real values back in place of the placeholders, then hands the answer to the plugin.
5. The call is logged with its plugin, model, tokens, estimated cost and response time.

The plugins themselves need no setup. Gatehouse works with any plugin or theme that uses the AI Client built into WordPress 7.0.
