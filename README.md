# Gatehouse

**AI cost, budget and privacy control for WordPress.**

WordPress 7.0 lets every plugin on a site share one AI connection, with no spending limit and no visibility. Gatehouse sits between your plugins and your AI provider, on your own server:

- See which plugin spends what, call by call, with forecasts and a request log
- Monthly budgets per plugin and for the whole site that stop calls before they're charged
- Personal data removed from prompts before they reach the AI provider, and put back in the answers
- One brand brief added to every AI request
- Works with any AI Client provider, including the local [AI Provider for WebLLM](https://github.com/ProgressPlanner/ai-provider-for-webllm) (calls logged at $0)

**Documentation:** [docs/](docs/README.md) in this repository, with screenshots ([Getting started](docs/getting-started.md), [FAQ](docs/faq.md), [Troubleshooting](docs/troubleshooting.md)).

**Website and help center:** https://george-stathopoulos.github.io/gatehouse/

## In this repository

This is the free plugin as it ships: PHP in `includes/`, the dashboard's source in `src/` and its compiled bundle in `build/`. Install it like any plugin, or download the zip from the website.

## Feedback

Ideas and bug reports are welcome in [Issues](https://github.com/george-stathopoulos/gatehouse/issues). Please report security issues privately through [GitHub's vulnerability reporting](https://github.com/george-stathopoulos/gatehouse/security/advisories/new).

## License

GPL-2.0-or-later. See [LICENSE](LICENSE).

---

**More projects:** [Helpdesk Hero](https://george-stathopoulos.github.io/helpdesk-hero/), WordPress support with diagnostics and password-free access · [All projects](https://george-stathopoulos.github.io/#projects)
