# FAQ

## General

### What does Gatehouse do?
It sits between your plugins and your AI provider:
- it shows which plugin made each AI call and what it cost;
- it stops spending at the budgets you set;
- it removes personal data from prompts before they leave your site;
- it can add one set of brand instructions to every request.

### Which plugins does it work with?
Any plugin or theme that uses the WordPress AI Client (`wp_ai_client_prompt()`), which is built into WordPress 7.0. The plugins themselves need no changes or settings.

### Which plugins does it *not* see?
Plugins that call an AI provider directly with their own API key, bypassing the WordPress AI Client. Most AI plugins are moving to the AI Client, because it lets site owners connect a provider once. If a plugin you use doesn't appear on the Sources page after using its AI features, it probably makes its own calls.

### Which AI providers are supported?
Anthropic (Claude), OpenAI (GPT) and Google (Gemini) are supported for cost tracking, redaction and the brand brief. Cost tracking works for any provider that reports token usage to the AI Client. A developer can add more providers for redaction and the brief; see [For developers](developers.md#adding-a-provider).

That includes [AI Provider for WebLLM](https://github.com/ProgressPlanner/ai-provider-for-webllm), which runs a model privately in your browser at no cost. Gatehouse logs its calls at $0 ([set it up](local-ai.md)).

### Does Gatehouse need its own API key or account?
No. It uses the AI provider you connect under **Settings → Connectors**. There is no Gatehouse account or service.

### Does it slow down AI calls?
Not noticeably. Gatehouse works on your server before and after each call: it checks a cached spend total, scans the prompt text for personal data, and writes one row to the database. These take milliseconds, while AI providers usually take seconds to answer.

### Does it work on multisite?
Each site keeps its own log, budgets and settings. There is no network-wide view yet.

## Costs and budgets

### Are the costs exact?
No, they are estimates: the provider's token counts × the price table. They don't include caching or batch discounts, taxes or plan fees. See [How costs are calculated](costs-and-pricing.md).

### How are model prices kept up to date?
Turn on **Update prices automatically** under **Settings → Model prices**; the setup guide offers it too. Gatehouse downloads current prices once a day from OpenRouter's public model list. Nothing about your site is sent. With it off, the built-in prices are used, which update with each plugin release. See [Where prices come from](costs-and-pricing.md#where-prices-come-from).

### What does the price download send?
Nothing about your site. It's a plain request for a public file, without your site address, usage data or keys. It's the only outside request Gatehouse makes, and only when you turn it on.

### My provider changed a price, or I have a negotiated rate. What do I do?
Edit the price under **Settings → Model prices**. Your price applies to new calls immediately and survives plugin updates. Past calls keep their recorded cost.

### A model shows "no price". Why?
It isn't in your price table. Turn on automatic price updates, which covers new Anthropic, OpenAI and Google models within a day. Or add its price under **Settings → Model prices**, with the one-click button for each unpriced model you've used. Its calls are logged at $0 until it has a price.

### What happens when a plugin reaches its budget?
Its next AI calls are stopped before anything is sent, so they cost nothing. The plugin gets the same error WordPress gives when AI is unavailable, and well-behaved plugins hide their AI buttons. The calls are logged as **Blocked**. The block lifts on the 1st of next month, or as soon as you raise the budget.

### Could a budget be exceeded slightly?
Yes, by part of one call. A budget is checked before each call, and a call's exact cost is only known after it finishes. So the call that crosses the line still completes; the next one is blocked.

### When do budgets reset?
At midnight on the 1st of each month, in your site's timezone.

### What is the forecast?
Spend so far this month plus the last 7 days' daily average for each remaining day. A source is **On pace to exceed** when its forecast is over its budget, so you can act before it's blocked. See [Forecasts](costs-and-pricing.md#forecasts).

### Can I pause a plugin's AI without deactivating the plugin?
Yes. On **Sources**, open its **Policy** and turn on **Pause AI**. The rest of the plugin keeps working.

## Gatehouse Pro

### What does Pro add?
Response caching: repeated identical AI requests are answered from a cache instead of being paid for again. Everything else in these docs is free. See [Gatehouse Pro](pro.md).

### How do I know whether Pro would save me money?
The Overview shows how many calls repeated an earlier request and what they cost, per plugin. If that number is small, you don't need Pro.

### Will caching give my visitors stale or wrong answers?
Only for plugins you choose, and only for up to the lifetime you set (24 hours by default). Cache plugins that ask the same question repeatedly (spam checks, alt text, FAQ answers), not ones that should give a fresh answer every time. Clear the cache after changing content that answers depend on.

### Does the cache store personal data?
Not the data that redaction removes: the cache only holds placeholders, and each answer is restored with the current request's own values.

## Privacy

### What personal data is removed?
- **On by default:** email addresses, phone numbers, payment card numbers (checked with the card checksum), IBANs and US Social Security numbers.
- **Optional:** IP addresses.
- **Your own list:** any custom terms you add.

See [Privacy](privacy.md).

### Are names removed?
Not automatically: detecting names reliably would need an outside service. Add important names (customers, staff) as **custom terms**.

### Won't redaction break plugins that need the data?
Usually not, because the real values are put back into the answer before the plugin sees it. For plugins that truly need exact data sent to the provider, turn on **Skip redaction** for that plugin only.

### Does Gatehouse store my prompts?
No, not unless you turn on **Store prompt and response excerpts** under **Settings → Logging**. By default it stores only facts about each call: source, model, tokens, cost, timing and counts.

### Does Gatehouse send any data anywhere?
No. Everything stays in your WordPress database. Gatehouse doesn't phone home or track usage. Its only outside request is the optional daily price download, which sends nothing about your site.

### Does Gatehouse work with WordPress's personal data export and erase tools?
Yes. **Tools → Export Personal Data** includes the person's AI requests, and **Tools → Erase Personal Data** anonymises them while keeping costs for your budgets. Gatehouse also suggests text for your privacy policy. See [Your data](data.md#personal-data-and-privacy-laws).

### Is the dashboard accessible?
It is designed to meet WCAG 2.2 AA:
- every screen is checked automatically for contrast and structure, in light and dark mode;
- everything works with the keyboard, and details panels keep focus inside until you close them with **Esc**;
- each chart has a **Table** view for screen readers;
- status is shown with text and icons, never by colour alone;
- animations are turned off when your system asks for reduced motion.

If something doesn't work with your assistive technology, please tell us.

## Brand brief

### Will the brief override a plugin's own instructions?
No. It is added **after** the plugin's instructions. If a plugin needs its prompts left exactly as written, switch the brief off for that plugin.

### How much does the brief cost?
The Brand brief page estimates it from the brief's length, your call volume and your average input price. A few sentences typically cost cents per month.

## Managing data

### How do I start over?
Under **Settings → Data**, click **Clear log**, then **Click again to confirm**. This deletes the request log and resets this month's spend. Settings are kept.

### What does uninstalling remove?
Deleting the plugin removes its database table, settings and scheduled tasks. Deactivating keeps everything. See [Your data](data.md#deactivating-and-uninstalling).

### Can I try Gatehouse with sample data?
Yes, even on a live site. Turn on the **Demo data** switch at the top right of Gatehouse. Sample data lives in a separate sandbox and never touches your real data or settings. See [Explore with demo data](getting-started.md#explore-with-demo-data).

### Does Gatehouse need approval in the AI plugin's Connector Approval?
No. Gatehouse never calls AI itself. It logs other plugins' calls that Connector Approval blocks, and lists the plugins waiting for approval. See [Connector Approval](getting-started.md#connector-approval).
