=== Gatehouse ===
Contributors: mindanticipation
Tags: ai, ai cost, privacy, budget, ai client
Requires at least: 7.0
Tested up to: 7.1
Requires PHP: 7.4
Stable tag: 1.5.0
License: GPLv2 or later
License URI: https://www.gnu.org/licenses/gpl-2.0.html

See, budget and protect every AI call your site makes. Per-plugin cost tracking, spending caps, personal-data redaction and a sitewide brand brief.

== Description ==

WordPress 7.0 gave every plugin one shared AI connection. That is great for site owners: connect Anthropic, OpenAI or Google once, and every plugin can use it. It also means one shared bill, and no way to see which plugin is spending it or what data is leaving your site.

Gatehouse sits between your plugins and your AI provider. It works with any plugin that uses the WordPress AI Client, with no setup in those plugins.

**Website and help center:** [george-stathopoulos.github.io/gatehouse](https://george-stathopoulos.github.io/gatehouse/), with step-by-step guides and screenshots of every screen.

= See where the money goes =

* Every AI call is traced to the plugin or theme that made it.
* Spend, tokens, model and response time for every call, with daily charts, a model mix, an activity heatmap and a searchable request log.
* A month-end forecast based on your recent pace, not guesswork.

= Set budgets that actually stop spending =

* A monthly budget per plugin or theme, and one for the whole site.
* When a budget is reached, Gatehouse blocks further calls before they reach the provider. Well-behaved plugins hide their AI features automatically while blocked.
* Pause any plugin's AI with one switch.
* Email alerts when a budget passes your threshold (80% by default) and when it is reached.

= Keep personal data on your site =

* Email addresses, phone numbers, payment card numbers (Luhn-checked), IBANs, US Social Security numbers and, optionally, IP addresses are replaced with placeholders such as `[EMAIL_1]` before a request leaves your server.
* When the answer comes back, Gatehouse puts the real values back, so plugins keep working as before.
* Add your own terms: customer names, project code names, anything that must never reach an AI provider.
* A live tester shows exactly what the provider will receive.

= Make every plugin sound like you =

* Write one brand brief (voice, spelling, rules such as "never promise refunds") and Gatehouse adds it to every AI request on the site.
* See what it costs per month at your current volume, and switch it off for individual plugins.

= Spot money wasted on repeated requests =

* Gatehouse notices when a plugin sends exactly the same AI request again, and shows what those repeats cost, per plugin. Only a fingerprint of each request is stored, never its text.

= Gatehouse Pro (optional, paid) =

Gatehouse is complete on its own. The optional **Gatehouse Pro** add-on adds **response caching**: repeated requests from the plugins you choose are answered instantly from a cache instead of being paid for again. Cached answers never contain the personal data that redaction removed. Pro is sold separately and is not required for anything described above.

= Built for WordPress 7 =

Gatehouse uses only WordPress's own AI Client hooks and HTTP API. It does not replace or wrap your AI provider plugins, and it works with Anthropic, OpenAI and Google request formats. Other providers can be added with the `gatehouse_provider_hosts` filter.

= Privacy =

Gatehouse does not send your data anywhere. It stores a log of AI calls (source, model, token counts, estimated cost, timing) in your own database. The only outside request it can make is the optional daily price download described under External services. Prompt and response text is not stored unless you turn on excerpts. History is deleted automatically after 90 days by default.

Gatehouse works with WordPress's privacy tools: Tools → Export Personal Data includes a person's AI requests, Tools → Erase Personal Data anonymises them, and a suggested paragraph is added to the Privacy Policy Guide.

= Accessibility =

The dashboard is designed to meet WCAG 2.2 AA. It is fully keyboard operable, every chart has a table view for screen readers, status is never shown by colour alone, and it respects your reduced-motion setting. Every screen is checked automatically in light and dark mode.

= How costs are calculated =

Costs are estimates: the token counts your AI provider reports for each call, multiplied by a price per model. Your provider's invoice is always the source of truth.

Turn on **Update prices automatically** (offered in the setup guide and under Settings → Model prices) and Gatehouse downloads current prices once a day from OpenRouter's public model list, which covers Anthropic, OpenAI and Google models. With it off, the price table built into the plugin is used and updated with each release; the dashboard warns you if those prices are more than four months old. Prices you edit yourself always take priority.

== External services ==

This plugin can connect to one external service, and only if you turn it on.

**OpenRouter public model list** (`https://openrouter.ai/api/v1/models`). Used to keep the model price table current, so cost estimates stay accurate. It is off until you turn on "Update prices automatically" in the setup guide or under Settings → Model prices. When on, Gatehouse downloads the list once a day, and when you click "Update now". The request is a plain download: it sends no site address, user data, usage data or API keys (the user agent is "Gatehouse/version"). OpenRouter's [terms of service](https://openrouter.ai/terms) and [privacy policy](https://openrouter.ai/privacy).

Gatehouse does not send your prompts, AI responses or usage data anywhere. Your AI calls go only to the AI provider you connected, as they would without Gatehouse.

== Installation ==

1. Install and activate Gatehouse.
2. A short setup guide opens. It helps you connect an AI provider, approve plugins if you use the AI plugin's Connector Approval, and set a budget.
3. Calls appear on the Gatehouse dashboard as soon as any plugin uses AI.

Want to look around first? Turn on **Demo data** at the top right of Gatehouse. Sample data is kept in a separate sandbox and never touches your real data or settings.

== Frequently Asked Questions ==

= Which plugins does it work with? =

Any plugin or theme that makes AI calls through the WordPress AI Client (`wp_ai_client_prompt()`), which is built into WordPress 7.0. Plugins that call an AI provider directly with their own API key bypass the AI Client, so Gatehouse cannot see them.

= Does it slow down AI calls? =

No noticeable amount. The gateway does its work in PHP on your server before and after each request: a budget lookup from a cached total, a pass over the prompt text, and one database insert.

= What happens when a plugin hits its budget? =

Its next AI call is stopped before anything is sent, and the plugin receives the same error WordPress uses when AI is unavailable. The call is logged as "Blocked". Budgets reset on the first day of each month.

= Can it catch names in prompts? =

Not automatically. Names are hard to detect reliably without sending text to another service. Add the names that matter to you, such as key customers or staff, as custom terms on the Privacy page.

= Does it work with the AI plugin's Connector Approval? =

Yes. Gatehouse never calls AI itself, so it never needs approval. It logs the calls Connector Approval blocks and shows which plugins are waiting for approval.

= Where do I find help? =

Click **Help** at the top right of Gatehouse for guides, answers, troubleshooting and a glossary. Hover any ⓘ icon for a quick explanation.

= What is Gatehouse Pro? =

An optional paid add-on that answers repeated AI requests from a cache, so you don't pay the provider twice for the same answer. The free plugin shows how much your repeated requests cost before you decide.

= Are the costs exact? =

They are estimates from the token counts each provider reports and the price table under Settings. They do not include provider discounts such as prompt caching or batch pricing, taxes, or minimum charges. Your provider's invoice is the source of truth.

= How are model prices kept up to date? =

Turn on "Update prices automatically" under Settings → Model prices (the setup guide offers it too). Gatehouse then downloads current prices once a day from OpenRouter's public model list. Nothing about your site is sent. With it off, the built-in prices are used and updated with each plugin release.

= What if my provider changes a price, or I have a negotiated rate? =

Edit the price under Settings → Model prices. Your edit applies to future calls straight away and is kept when the plugin updates. Past calls keep the cost recorded at the time.

= A model shows "no price". What do I do? =

The model isn't in the price table yet. Turn on automatic price updates, which covers new Anthropic, OpenAI and Google models within a day. Or add its price under Settings → Model prices (there is a one-click "+ model" button for every unpriced model in use). Its calls are logged with a cost of $0 until it has a price.

== Screenshots ==

1. Overview: spend by plugin, month-end forecast, budget status and activity.
2. Sources: budgets, forecasts and policies for each plugin and theme.
3. Requests: every call with model, tokens, cost, timing and what the gateway changed.
4. Privacy: detectors, custom terms and a live redaction tester.
5. Brand brief: one set of instructions for every plugin, with a cost estimate.

== Changelog ==

= 1.5.0 =
* New: works with AI Provider for WebLLM, which runs AI models privately in the browser, with a step-by-step setup guide. Its calls are logged at $0, and the dashboard suggests it when no provider is connected, or says when its in-browser worker is off.
* New: the documentation is also in the plugin's GitHub repository.
* The website links to the author's other projects, and has a live demo.
* Fix: the setup guide no longer opens right after activation when it was already completed (for example from WP-CLI).

= 1.4.0 =
* AI Gateway is now Gatehouse. Same plugin, new name.
* New: website with guides and the help center at https://george-stathopoulos.github.io/gatehouse/, linked from the dashboard footer.

= 1.3.1 =
* New: personal data export and erasure through WordPress's privacy tools, and suggested privacy policy text.
* Accessibility: stronger text contrast in light and dark mode, underlined links in text, and keyboard focus kept inside detail panels.

= 1.3.0 =
* New: automatic model price updates, once a day, from OpenRouter's public model list (opt-in; offered in the setup guide and under Settings → Model prices). New models get a price within a day; your own edits always win; the built-in table remains the fallback.
* New: "Update now", live-price status and model search in the price table.
* Fix: the price-table example now shows real model ids.

= 1.2.0 =
* New: step-by-step setup guide on activation (provider, Connector Approval, budget and alerts).
* New: Demo data switch, with sample data in a separate sandbox that never affects live data or settings.
* New: Help page with guides, FAQ, troubleshooting and glossary, plus ⓘ tooltips throughout.
* New: compatibility with the AI plugin's Connector Approval. Blocked calls are logged and waiting plugins are listed.
* Fix: Gatehouse no longer triggers an approval request for itself. Provider status is read from configured keys, without calling the provider.

= 1.1.0 =
* New: repeated-request detection. The Overview shows how many calls repeated an identical earlier request and what they cost, per plugin.
* New: support for the optional Gatehouse Pro add-on (response caching). Cached calls are shown as "From cache" with the amount saved.
* New: extension points for add-ons (`gatehouse_record_row` filter, `gatehouse_admin_enqueue` action, `gatehouse.routes` JavaScript filter).
* Fix: toggle switches did not respond to mouse clicks.
* The database table gains three columns; the upgrade runs automatically.

= 1.0.0 =
* First release. Built-in model prices checked 2026-10-01.
