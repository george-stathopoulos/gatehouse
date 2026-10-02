# For developers

## How Gatehouse works

Gatehouse does not wrap or replace AI provider plugins. It uses hooks from the WordPress 7.0 AI Client and the standard HTTP API:

| Step | Hook | What Gatehouse does |
|---|---|---|
| 1 | `wp_ai_client_prevent_prompt` (filter) | Works out which plugin or theme is calling, from the call stack. Returns `true` to block the call if the source is paused, or a budget is reached. |
| 2 | `wp_ai_client_before_generate_result` (action) | Starts the timer. |
| 3 | `http_request_args` (filter) | For POST requests to a known provider host: redacts personal data in the JSON body and adds the brand brief to the system instructions. |
| 4 | `http_response` (filter) | Puts the redacted values back into the provider's response body. |
| 5 | `wp_ai_client_after_generate_result` (action) | Records model, provider, token usage, estimated cost and timing. |
| — | `http_api_debug` (action) | Records provider errors (HTTP 4xx/5xx) and network failures. |

Notes:

- **Blocked `is_supported_*()` checks are not logged.** When a source is blocked, `wp_ai_client_prompt()->is_supported_*()` returns `false` silently, so plugins can hide their AI features without filling the log.
- **Where the code lives:**
  - `includes/class-gateway.php`: the hooks;
  - `includes/class-redactor.php`: redaction;
  - `includes/class-provider-adapters.php`: provider request formats;
  - `includes/class-ledger.php`: storage and monthly totals;
  - `includes/class-stats.php`: dashboard numbers.

## Filters and actions

### `gatehouse_provider_hosts`

Maps API hosts to provider IDs. Requests to these hosts are redacted, and text-generation requests get the brand brief.

```php
add_filter( 'gatehouse_provider_hosts', function ( $hosts ) {
	$hosts['llm.internal.example.com'] = 'self-hosted';
	return $hosts;
} );
```

### Adding a provider

Add its host with `gatehouse_provider_hosts`, as above.

- **Redaction** applies to every POST request to that host, except model listings (paths ending in `/models`).
- **The brand brief** is added when the URL path matches one of these formats:

| Path ends with | Format |
|---|---|
| `/v1/messages` | Anthropic Messages |
| `/responses` | OpenAI Responses |
| `/chat/completions` | OpenAI-compatible chat (most self-hosted and gateway servers) |
| `:generateContent` / `:streamGenerateContent` | Google Gemini |

### `gatehouse_price_source_url`

The URL of the price list used by automatic price updates. It defaults to OpenRouter's public model list. A replacement must return the same format: `{ "data": [ { "id": "provider/model", "pricing": { "prompt": "<USD per token>", "completion": "<USD per token>" } } ] }`.

### `gatehouse_default_prices`

Changes the built-in price table: USD per million tokens, as `[input, output]`. Prices saved in **Settings → Model prices** still take priority.

```php
add_filter( 'gatehouse_default_prices', function ( $prices ) {
	$prices['my-fine-tuned-model'] = array( 3.0, 12.0 );
	return $prices;
} );
```

### `gatehouse_attribution_skip`

Plugin slugs to skip when working out who made a call. Use it for your own "middleman" plugins that make AI calls on behalf of other plugins, so the call is attributed to the plugin further up the call stack.

```php
add_filter( 'gatehouse_attribution_skip', function ( $slugs ) {
	$slugs[] = 'my-ai-helper-library';
	return $slugs;
} );
```

### `gatehouse_record_row` (filter)

Adjusts a call's row just before it is saved. Gatehouse Pro uses it to mark cached calls: `cached` = 1, the cost moved into `saved`, and `cost` = 0.

### `gatehouse_admin_enqueue` (action) and `window.gatehouse`

Fires after the dashboard script is enqueued. Pass the handle (`gatehouse-admin`) as a dependency of your own script.

- **Shared components:** your script can use the dashboard's components from `window.gatehouse`: `ui`, `charts`, `Icon`, `format`, `hooks`, `colors` and `settings`.
- **Adding a page:** register it with the `gatehouse.routes` filter from `@wordpress/hooks`:

```js
import { addFilter } from '@wordpress/hooks';
addFilter( 'gatehouse.routes', 'my-addon', ( routes ) => [
	...routes,
	{ id: 'my-page', label: 'My page', icon: 'spark', Page: MyPage },
] );
```

### `gatehouse_pro_active` and `gatehouse_pro_url` (filters)

`gatehouse_pro_active` tells the dashboard a caching add-on is installed. `gatehouse_pro_url` sets the link on the repeated-requests card; when it is empty, no link is shown.

### `gatehouse_connector_approval_active`, `gatehouse_docs_url`, `gatehouse_support_url` (filters)

- `gatehouse_connector_approval_active` overrides the detection of the AI plugin's Connector Approval feature.
- `gatehouse_docs_url` sets the "Full documentation" link on the Help page.
- `gatehouse_support_url` sets the "Get support" link on the Help page.

### Demo mode

Demo mode is per user (user meta `gatehouse_demo_mode`) and only applies inside Gatehouse's own REST requests. While it applies:
- `Gatehouse_Ledger::table()` returns `{prefix}gatehouse_demo_requests`;
- settings come from `gatehouse_demo_settings`;
- month totals use `gatehouse_demo_spend_*` options.

Run code against the sandbox with `Gatehouse_Demo::run( $callback )`.

### `gatehouse_recorded` (action)

Fires after each call is logged, with the row ID and the row's values. Use it to forward usage to your own monitoring.

```php
add_action( 'gatehouse_recorded', function ( $id, $row ) {
	if ( 'error' === $row['status'] ) {
		error_log( "AI call failed for {$row['source']}: {$row['note']}" );
	}
}, 10, 2 );
```

`$row` keys:
- `created_at`, `source`, `user_id`, `provider`, `model`, `capability`, `status` (`ok`, `blocked` or `error`);
- `input_tokens`, `output_tokens`, `cost`, `priced`, `latency_ms`;
- `redactions`, `brief`, `note`, `prompt_excerpt`, `response_excerpt`.

## Source IDs

Sources are identified as `type:slug`:

| Example | Meaning |
|---|---|
| `plugin:woocommerce` | A plugin, by its folder name (or file name for single-file plugins) |
| `theme:twentytwentysix` | A theme |
| `mu-plugin:custom-ai` | A must-use plugin |
| `core` | No plugin or theme found in the call stack |

## WP-CLI

| Command | What it does |
|---|---|
| `wp gatehouse status` | Month-to-date spend per source, with budgets and paused state |
| `wp gatehouse seed [--days=45] [--per-day=140] [--seed=7] [--demo]` | Adds fictional sample traffic to the **live** log (for development and screenshots), or to the demo sandbox with `--demo`. Site owners should use the dashboard's Demo data switch instead. |
| `wp gatehouse reset [--yes]` | Deletes the request log and month-to-date totals. Settings are kept. |

## REST API

The dashboard uses these routes under `/wp-json/gatehouse/v1`. All of them require the `manage_options` capability.

| Method | Route | Purpose |
|---|---|---|
| GET | `/overview?days=30` | Everything on the Overview page |
| GET | `/sources?days=30` | Sources with spend, forecast, policy and status |
| POST | `/sources` | Update one source's policy: `{ "source": "plugin:x", "policy": { "budget": 10, "paused": false, "skip_brief": false, "skip_redaction": false } }` |
| GET | `/requests?page=1&per_page=25&source=&status=&model=&redacted=` | The request log, plus the source and model lists for the filters |
| DELETE | `/requests` | Clear the request log |
| GET / POST | `/settings` | Read or update settings; the POST body is a partial settings object |
| POST | `/redact-preview` | `{ "text": "…", "redaction": { … } }` returns the redacted text and counts |

## Building from source

Requires Node.js. PHP and Docker are not needed: development uses [WordPress Playground](https://wordpress.github.io/wordpress-playground/).

```bash
npm install
npm run build        # or: npm start (watch mode)
npm run lint:js
```

**Local site with sample data:**

```bash
npx @wp-playground/cli@latest server --port=9400 \
  --mount=.:/wordpress/wp-content/plugins/gatehouse \
  --blueprint=dev/blueprint.json --login
```

**Integration tests.** These run in a throwaway WordPress, with the real Anthropic provider plugin talking to a mock API:

```bash
tests/run.sh
```

**Documentation screenshots.** Run with the local site above running; uses your installed Chrome:

```bash
node dev/screenshots.mjs
```

**Release zip:**

```bash
bin/build-zip.sh     # writes dist/gatehouse.zip
```

## Release checklist

1. **Review the built-in model prices** against each provider's official price page. They're the fallback when automatic updates are off or a model isn't in the live list:
   - update the table in `includes/class-pricing.php`;
   - set `Gatehouse_Pricing::CHECKED` to today's date;
   - add any new models.
2. **Bump the version** in `gatehouse.php` (header and `GATEHOUSE_VERSION`) and in the `Stable tag` line of `readme.txt`.
3. **Add a changelog entry** in `readme.txt`. Mention the price review, for example "Model prices checked 2026-12-01; added gpt-5.6".
4. **Run `tests/run.sh`, `npm run lint:js` and the Plugin Check plugin** against the zip.
5. **Run `bin/build-zip.sh`**, and refresh the screenshots if the interface changed.

Sites with automatic price updates stay current on their own. For everyone else, plan a release every few months that refreshes the built-in table. The dashboard warns users when built-in prices are more than 120 days old.
