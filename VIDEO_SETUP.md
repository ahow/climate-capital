# Video briefings — setup guide

Climate Capital can play AI-generated news-anchor video briefings before each
round and a personalised closing video at the end of round 6. Videos are
generated via [HeyGen](https://www.heygen.com/) and cached server-side: every
round's briefing video is generated the first time any player reaches that
round, then served from cache to everyone afterwards. The closing video is
generated per player with their name and portfolio performance.

If HeyGen is not configured, the game silently falls back to the existing
text-only briefing UI. **You can deploy the code right now without HeyGen and
nothing will break.** Set the env vars below later to turn the feature on.

## Required env vars

Set these in **heroku.com → app → Settings → Reveal Config Vars**:

| Variable | Required? | Purpose |
| --- | --- | --- |
| `HEYGEN_API_KEY` | **yes — to enable video** | Authenticates against HeyGen's API. Without it, the app uses the text fallback. |
| `APP_BASE_URL` | recommended | Public URL HeyGen will POST webhook callbacks to. Set to `https://claude-climate-game-7292a5cc6677.herokuapp.com`. |
| `HEYGEN_AVATAR_ID` | optional | Avatar look ID. Falls back to a sensible default if unset. |
| `HEYGEN_VOICE_ID` | optional | Voice ID. Falls back to a sensible default if unset. |
| `HEYGEN_WEBHOOK_SECRET` | optional but recommended | Shared secret for webhook signature verification. Without it, all webhooks are accepted (dev mode). |
| `DISABLE_VIDEO` | optional kill switch | Set to `true` to force the text-only fallback even if `HEYGEN_API_KEY` is set. |

## How to turn it on

1. Sign up at [heygen.com](https://www.heygen.com/) and get an API key from the developer dashboard.
2. Pick an avatar and voice that suit a sober financial-news tone. From the project root run:
   ```bash
   HEYGEN_API_KEY=sk_... npx tsx server/scripts/list-heygen-avatars.ts
   ```
   Copy the `avatar_id` and `voice_id` you want.
3. In Heroku, set `HEYGEN_API_KEY`, `APP_BASE_URL`, and (optionally) `HEYGEN_AVATAR_ID` / `HEYGEN_VOICE_ID` / `HEYGEN_WEBHOOK_SECRET`.
4. Restart the dyno. No code changes needed — the next briefing phase will trigger generation, and when HeyGen posts back to `/api/webhooks/heygen` the cached video is served to everyone.

## How it works

- `GET /api/videos/briefing/:round` — Client polls this when the player enters a briefing. First call kicks off generation; subsequent calls return the cached URL.
- `POST /api/videos/closing/:playerId` — Client posts this once when the player enters round-6 takeaways. The script is built from the player's portfolio and includes their name.
- `POST /api/webhooks/heygen` — HeyGen calls this when a video finishes rendering. Updates the cached row with the video URL (or a failure message). Signature verified via HMAC-SHA256 with `HEYGEN_WEBHOOK_SECRET` when set.

## Cost control

- Round briefing videos are cached per-round across all players: at most 6 videos for the entire deployment.
- Closing videos are 1 per player. If you reset a player and they reach round 6 again, a new video is generated (the cache key is the player ID).
- Setting `DISABLE_VIDEO=true` instantly reverts to text. Already-cached videos are not deleted.

## Brand and content guarantees

- Scripts use the game's pseudonymous asset names — no real company names.
- Tone is sober and professional, matching the Schroders briefing style.
- All copy lives in `shared/gameData.ts` (`videoScript` field per round, and the
  `buildClosingScript` function for the personalised closing).
