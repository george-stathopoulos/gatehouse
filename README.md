# Gatehouse

**See what each plugin spends on AI, cap it, and see which plugins send personal data to AI providers.** A free WordPress plugin.

- **Cost per plugin:** every AI call Gatehouse sees is traced to the plugin or theme that made it, with model, tokens, estimated cost, forecasts and a request log.
- **Stop spending:** monthly budgets (per plugin and site-wide), hourly call limits and a pause switch. Calls are stopped before they're sent.
- **Alerts:** for budgets, hourly limits and unusual activity.
- **Personal data:** shows which plugins send emails, phone numbers, card numbers, IBANs, US SSNs or your own terms to AI providers. Detection changes nothing; you can turn on redaction (placeholders out, real values back in the answer) per plugin. Pattern-based: it doesn't catch every name or address.
- **AI data map:** a CSV of which plugins send what to which providers.

## What it can and can't see

- **Sees:** plugins that use the WordPress AI Client, and plugins that call Anthropic, OpenAI, Google, OpenRouter, xAI, Mistral, DeepSeek, Groq or Perplexity directly through WordPress's HTTP functions (for example AI Engine).
- **Can't see:** plugins that send AI requests to their own service (many SEO, page builder and form plugins), or that bypass WordPress's HTTP functions.
- **Streamed answers** read by the plugin itself are seen and can be blocked, but have no known cost.

## Install

Download `gatehouse.zip` from the [latest release](https://github.com/george-stathopoulos/gatehouse/releases/latest), then in WordPress go to **Plugins → Add New → Upload Plugin**. Requires WordPress 7.0+ and PHP 7.4+.

**Documentation:** [docs/](docs/README.md) in this repository ([Getting started](docs/getting-started.md), [FAQ](docs/faq.md), [Troubleshooting](docs/troubleshooting.md)).

**Website, live demo and help center:** https://george-stathopoulos.github.io/gatehouse/

## In this repository

This is the plugin as it ships: PHP in `includes/`, the dashboard's source in `src/` and its compiled bundle in `build/`.

## Feedback

Ideas and bug reports are welcome in [Issues](https://github.com/george-stathopoulos/gatehouse/issues). Please report security issues privately through [GitHub's vulnerability reporting](https://github.com/george-stathopoulos/gatehouse/security/advisories/new).

## License

GPL-2.0-or-later. See [LICENSE](LICENSE).

---

**More projects:** [Helpdesk Hero](https://george-stathopoulos.github.io/helpdesk-hero/), WordPress support with diagnostics and password-free access · [All projects](https://george-stathopoulos.github.io/#projects)
