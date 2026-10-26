# Deploy the complete simulator and AI assistant

Extract this archive into a **fresh folder**. Push the project source to your
repository without any `.env` or `.env.local` file. Actual credentials are not
included in the archive. The simulator runs in the browser; the AI assistant's
cloud calls run on the Node server.

## Recommended: one Node web service

This project includes a `Dockerfile`, `.dockerignore`, and `render.yaml`.

### Render using the included blueprint

1. Push the contents of `gmusim-main/` to the root of your Git repository.
2. In Render, create a Blueprint from that repository. The included `render.yaml`
   creates a Docker web service with `/health` as its health check.
3. Enter `OPENAI_API_KEY` when prompted. Use the actual key as a secret value;
   do not put it in the repository or a `VITE_*` variable.
4. Deploy. Open `/health`, then open the site and the top-right **+** assistant.
5. Select **OpenAI** and ask for an addition program. The response label must
   say **OpenAI**, not **Offline program library**.

The blueprint requests the free plan. Free hosting may idle or take time to
start; use a suitable always-on plan if startup latency matters. An offline
fallback cannot remove a sleeping host's startup delay before the page opens.

If your repository has a parent folder, set the service root directory to
`gmusim-main` so the Dockerfile and package.json are in the build root.

### Any Node hosting platform (without Docker)

- Node version: **22.12+**.
- Build command: `npm ci && npm run build`.
- Start command: `npm start`.
- Environment: set `NODE_ENV=production` and `OPENAI_API_KEY`.
- Let the platform supply `PORT`. Set `HOST=0.0.0.0` if required explicitly.
- Health check: `/health`.
- Serve the entire Node application at one origin. Do not deploy just `dist/`
  when you expect cloud AI to work.

The build compiles both frontend and backend. Runtime does not require `tsx`
or TypeScript. After building, `npm ci --omit=dev` is supported.

### Local Docker

```sh
docker build -t gnusim8085 .
docker run --rm -p 3000:3000 --env-file .env.local gnusim8085
```

Local secrets are excluded from the Docker build context. The image runs as the
non-root Node user. Inject secrets at runtime.

## Environment settings

| Name | Purpose / default |
| --- | --- |
| `OPENAI_API_KEY` | Required for OpenAI answers; server only |
| `OPENAI_MODEL` | `gpt-4.1-mini` |
| `GEMINI_API_KEY` | Optional secondary provider |
| `GEMINI_MODEL` | `gemini-flash-latest` |
| `ASSISTANT_ACCESS_TOKEN` | Optional shared access code, up to 256 characters; entered in the assistant panel |
| `APP_ORIGIN` | Exact public origin, e.g. `https://your-service.onrender.com`; no trailing path |
| `TRUST_PROXY` | Trusted reverse proxy hop count or subnet; included Render blueprint uses `1` |
| `AI_REQUESTS_PER_MINUTE` | Per-client request cap, default `8` |
| `AI_MAX_CONCURRENT` | Concurrent AI requests per server, default `4` |
| `AI_DAILY_REQUEST_LIMIT` | Requests per server per UTC day, default `200` |
| `OLLAMA_ENABLED` | Optional fallback to a model on the same server; default `false` |
| `OLLAMA_MODEL` | Default `qwen2.5-coder:7b` |

On Render, `RENDER_EXTERNAL_URL` supplies the origin automatically. Elsewhere,
set `APP_ORIGIN` when the proxy rewrites the Host header. Set `TRUST_PROXY` only
to the actual trusted proxy configuration; blindly trusting forwarded IPs lets
clients bypass per-IP limits. Same-origin checks do not replace authentication.
For a private college group, set `ASSISTANT_ACCESS_TOKEN` and share that access
code with intended users. It is not an OpenAI API key.

The default safeguards are suitable for a small pilot on one server. Counters
reset when the process restarts and are not shared between replicas. Use a
shared rate-limit/budget store for larger deployments, and set provider-side
project spending controls. A shared access code is not a full user account or
role-management system.

## Verify before sharing the site

```sh
npm test
npm run lint
npm run build
npm run check:production
npm run check:ai
```

`check:production` starts the compiled server and checks its health, frontend,
and offline assistant API without calling a paid provider. `check:ai` makes a
real OpenAI request: it asks for 23H + 46H, checks the assembly, runs it, and
expects 69H in memory at 2052H. Run it with the deployment key in the environment.
It returns a failure status if OpenAI is unavailable or the result is wrong.

The supplied key's live test received **HTTP 429**, so a successful OpenAI
answer has not been verified. A 429 may involve account quota or rate limits;
confirm the details in your provider dashboard. Authentication errors, missing
keys, timeouts, model errors, and fallback providers are reported separately in
the app without exposing raw SDK errors or credentials.

A key marked "configured" means a secret exists; it does not prove billing,
quota or model access. `/health` means the web process is healthy; it does not
spend tokens checking the model.

## Behavior and limits

- Auto prefers configured OpenAI, then Gemini, then enabled Ollama, then the
  built-in offline library. Each response states which provider answered.
- Cloud requests time out and do not retry indefinitely. Output length and
  conversation context are bounded. Syntax repair can make one additional
  model call; daily request caps count user requests, not token costs.
- Pressing Stop cancels the browser request and passes cancellation to the
  active provider call. Providers may already have processed some tokens.
- AI syntax validation is not proof of algorithm correctness. Inspect and run
  generated programs, especially for carry/borrow and edge cases.
- Client code is sent only if "Include current editor code" is checked. Chat
  state stays in memory; the app does not persist conversations on the server.
- Cached frontend assets and the offline example library work after a successful
  production visit on HTTPS/localhost. OpenAI and Gemini always need internet.
- Local AI on a deployed server uses that server's Ollama instance. A server on
  Render cannot access a visitor's laptop model via its own localhost address.
- Static-only hosting can serve the simulator and built-in examples, but has
  no `/api/assistant/chat` endpoint. Use a Node web service for this package;
  Vercel-style static deployments require a separate serverless API adapter.

Docker configuration is provided; Docker was not available for an image-build
check in the repair environment. The compiled production runtime and a clean
install without development dependencies are checked separately.

References: https://render.com/docs/web-services and
https://developers.openai.com/api/docs/guides/structured-outputs .
