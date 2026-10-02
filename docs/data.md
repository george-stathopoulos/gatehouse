# Your data

Gatehouse keeps everything in your own WordPress database. It sends nothing to its authors or to any outside service.

The only outside request it can make is the optional daily **price download** from OpenRouter's public model list (see [How costs are calculated](costs-and-pricing.md#automatic-price-updates-recommended)). It is off until you turn it on, and the request contains nothing about your site.

## What is stored

### The request log

One row per AI call, in the database table `{prefix}gatehouse_requests` (usually `wp_gatehouse_requests`):

| Field | Example |
|---|---|
| Time (site timezone) | `2026-10-01 08:32:10` |
| Source | `plugin:helpdesk-bot` |
| User ID who triggered the call | `1` (0 for visitors and background jobs) |
| Provider and model | `anthropic`, `claude-haiku-4-5` |
| Capability | `text_generation` |
| Status | completed, blocked or failed |
| Input and output tokens | `1612`, `456` |
| Estimated cost, and whether the model had a price | `0.0039` |
| Response time | `938` ms |
| Kinds of personal data found, and how many | `email:2,phone:1` (never the values) |
| Number of items replaced, when redaction is on for that source | `3` |
| Route | `ai_client` (WordPress AI Client) or `direct` (the plugin's own API key) |
| Note | block reason or provider error |
| Request fingerprint | a one-way hash of the request as sent. It cannot be turned back into the prompt. |
| Prompt and response excerpts | **Empty unless you turn on excerpts** |

**What is never stored:**
- prompt or response text, unless you turn on excerpts;
- the personal data that was detected or replaced;
- API keys.

### Settings and totals

Gatehouse's own options in the WordPress options table:

| Option | Contents |
|---|---|
| `gatehouse_settings` | All settings: budgets, hourly limits, policies, alerts, personal data detection and redaction, logging, price edits |
| `gatehouse_spend_YYYYMM` | Month-to-date spend totals per source, one option per month |
| `gatehouse_alerts_YYYYMM` | Which budget alert emails were sent that month |
| `gatehouse_alerts_rate`, `gatehouse_alerts_spike` | The last day an hourly-limit or spike alert was sent, per source |
| `gatehouse_synced_prices` | The last downloaded price list, when automatic price updates are on |
| `gatehouse_source_labels` | Plugin and theme names, so history stays readable after a plugin is deleted |
| `gatehouse_db_version` | Database table version |
| `gatehouse_providers` (transient) | Which AI providers are connected, cached for 10 minutes |

Scheduled WordPress tasks: `gatehouse_prune` (daily) deletes calls older than your retention period; `gatehouse_spike_check` (hourly) looks for unusual activity; `gatehouse_price_sync` (daily) downloads prices, and only exists while automatic price updates are on.

## How long data is kept

- **Calls:** 90 days by default (30, 90, 180 or 365 days). Change this under [Settings → Logging](settings.md#logging).
- **Monthly totals and alert markers:** kept until you clear the log or uninstall.

## Personal data and privacy laws

- **Gatehouse shows which plugins send personal data to AI providers,** and can replace it for the plugins you choose. Detection and redaction are pattern-based: they reduce what leaves your site, they don't guarantee nothing personal is sent. See [Privacy](privacy.md).
- **The AI data map** (Privacy page) gives you a spreadsheet of which plugins send what to which providers, for your records of processing.
- **The request log stores user IDs, not names or emails.** With excerpts turned on, detected personal data is masked in stored prompts. Answers are stored as your plugin received them, so they can contain personal data. Only turn excerpts on when you need them.
- **Export and erasure requests are handled by WordPress's own privacy tools.**
  - **Tools → Export Personal Data** includes a person's AI requests: date, source, model, status, tokens, estimated cost and any stored excerpts.
  - **Tools → Erase Personal Data** anonymises them. The link to the user and any excerpts are removed, but the cost stays so budgets remain correct.
  - Only calls made while the person was logged in are linked to them.
- **Privacy policy text:** Gatehouse suggests a paragraph for your privacy policy under **Settings → Privacy → Policy Guide**. Adapt it to how your site uses AI.
- **To remove everything at once,** clear the whole log under [Settings → Data](settings.md#data).

Gatehouse does not replace your agreement with your AI provider about how *they* handle the data you send. Read your provider's data and retention terms.

## Deactivating and uninstalling

- **Deactivating** stops Gatehouse and its scheduled tasks, but keeps your log and settings, so nothing is lost if you reactivate.
- **Deleting the plugin** (Plugins → Delete) removes everything: the request table, every `gatehouse_` option and transient, and the scheduled tasks.
