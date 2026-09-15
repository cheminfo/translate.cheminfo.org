# translate.cheminfo.org

Translate the cheminfo sites in place, and send the edits as a pull request.

This is an **admin site**: no site of the family links to it, it is not in
`react-cheminfo`'s site registry, and every page answers `noindex`. It serves
the other sites without being reachable from them.

## How it works

1. **A site opened with `?translate=<locale>`** formats every message with an
   invisible marker in front of it — the message id, written in zero-width
   characters. Whatever the string becomes (a text node, a `title`, a
   `placeholder`, a prop of a third-party component), it can be found in the
   DOM without any component having been written for it.
2. **The overlay** scans the page, writes `data-translate-keys` and
   `data-translate-state` on every element showing a message, and outlines
   them. Text that carries no marker is outlined too: it is not translatable
   yet. `translate="no"` excludes names, formulas and code.
3. **Alt-click** opens the editor. Each keystroke reaches the page, so the
   translation is read where it will be shown; an edit that does not parse or
   changes the placeholders is refused, and the page keeps its text.
4. **Submit** sends the edits here. The server checks every message against
   `en.json` on the repository's default branch, then opens one pull request per
   repository: on a branch of the repository when the bot may push there, from
   its fork otherwise. A signed continuation token lets the same browser add to
   its open pull request instead of opening another.

The page and the overlay only share the bridge a page exposes as
`window.__cheminfoTranslate` (`translate-core`'s `TranslateBridge`), so the
overlay is released here, once, for every site.

## Layout

| Workspace  | What it holds                                                                      |
| ---------- | ---------------------------------------------------------------------------------- |
| `core`     | The marker, the catalog shape, the ICU checks, the merge, and the page's session   |
| `backend`  | `POST /v1/contributions`, the GitHub publishing, and the static admin page         |
| `frontend` | The admin page, the site runtime (`src/i18n`), and the overlay (`dist/overlay.js`) |

A catalog is a directory ending in `locales` holding `en.json` and one flat
`<locale>.json` per language, each mapping a key to an ICU MessageFormat string.

## Local development

```sh
npm install
npm run dev
```

The backend listens on 10914 and the Vite dev server on 10915. Open
<http://localhost:10915/?translate=fr> to translate the admin page itself.
Without `GITHUB_TOKEN` the server refuses submissions with a 503, and the
overlay still offers the translation as a download.

```sh
npm run test       # unit tests, types, tokens, lint, format
npm run test-e2e   # Playwright, against the dev servers
npm run build      # the admin page and overlay.js
```

## Deployment

```sh
cp .env.example .env
# uncomment one COMPOSE_FILE line, set GITHUB_TOKEN and CONTRIBUTION_SECRET
docker compose up -d
```

| Variable                 | Purpose                                                                   |
| ------------------------ | ------------------------------------------------------------------------- |
| `IMAGE_NAME`             | The published image, `ghcr.io/cheminfo/translate.cheminfo.org`            |
| `IMAGE_TAG`              | Rewritten by the deploy script                                            |
| `COMPOSE_FILE`           | `compose.yaml`, `compose.traefik.yaml` or `compose.cloudflared.yaml`      |
| `PORT`                   | Listening port, 10914                                                     |
| `TRUST_PROXY`            | The proxies whose `X-Forwarded-For` is believed; the rate limit needs it  |
| `GITHUB_TOKEN`           | The bot's classic token with `public_repo`; unset disables submitting     |
| `CONTRIBUTION_SECRET`    | Signs continuation tokens; `openssl rand -hex 32`                         |
| `ALLOWED_REPOSITORIES`   | `owner/repo` or `owner/*` patterns pull requests may target, `cheminfo/*` |
| `CONTRIBUTIONS_PER_HOUR` | Submissions allowed per client address per hour, 20                       |
| `TUNNEL_TOKEN`           | Cloudflare Tunnel token, for the cloudflared mode only                    |

The API is documented at `/docs`. The changelog is kept by release-please in
`CHANGELOG.md`.
