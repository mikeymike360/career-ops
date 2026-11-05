# Personal PC runtime

This setup runs the original Career Ops Next.js app and core scripts on this Windows PC. It does not replace the upstream workflow with a second job-search engine.

The Cloudflare Sites URL provides the existing access-key login. An authenticated outbound HTTPS relay carries browser requests to the loopback-only app. D1 holds request metadata; R2 temporarily holds request/response bodies. Delivered requests are deleted. Stale requests are cleaned while the PC is connected. No incoming router ports or separate Cloudflare account are required.

AI uses the original Claude Code adapter against local Ollama's Anthropic-compatible API. The local inference shim explicitly disables model thinking and pins the selected local model. Original worker permission fencing and the never-submit application boundary remain in place. Local inference is not billed as Claude API usage; the web parser suppresses Claude CLI's synthetic cost estimates for this launcher.

## Daily use

- Run `Start Personal Career Ops.cmd` in this checkout, or `Start Career Ops.cmd` in the parent folder. Keep this PC awake. A second start detects the running app.
- Open the existing private Career Desk website and enter your existing access key.
- In Config, use **Singapore eligibility and local runtime** for citizen, PR, work-pass-holder or foreign-applicant status. This updates `config/profile.yml` with backups through the original safe writer.
- Start from the original CV onboarding. Supply your real CV and preferences before evaluations or CV generation. Nothing has been filled with sample career data.
- Review application drafts and forms yourself. The original Playwright session previews/fills; you press Submit.
- Run `Stop Personal Career Ops.cmd` to stop this app's process tree. Restarting the PC also stops it.

## Local state

Machine-specific configuration, encrypted bridge credentials, tools and logs are ignored under `local/runtime/`. The bridge key is encrypted for this Windows account with DPAPI. It is separate from the website login key.

`local/runtime/settings.json` holds the PowerShell executable path and selected Ollama model. This PC defaults to `career-ops-qwen2b:latest` (Qwen 3.5 2B, 64k context); `career-ops-qwen9b:latest` is also available. Stop the runtime, change `model`, then start it to switch. The 9B model is much slower on this CPU-only PC. Local web AI timeouts are extended up to one hour; normal upstream installations retain their original limits.

The original app uses the complete checkout's CV, profile, modes, portals, tracker, reports and output files. The prior Cloudflare-only workspace was backed up locally before switching; it contained Singapore PR status and no CV or saved jobs.

## Validation and limits

Validated: production build, worker permission/parser tests, profile backup and malformed-file preservation, live login blocking, cross-origin write rejection, original API access, relay progress streaming, and a Claude Code request completed by local Ollama.

A full application cannot be validated without the user's CV and a selected vacancy. Provider access, account logins, CAPTCHA and native Ollama WebSearch availability still depend on the original providers; no provider restrictions are bypassed. Local small-model output needs human review and is not equivalent in quality to the original project's recommended hosted Claude models.

The website server and inference shim bind only to loopback. The relay runs as this Windows user; a person holding the website access key can operate the same private career workspace. Keep the key private.
