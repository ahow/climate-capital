/**
 * One-time helper: lists available HeyGen avatars and voices so you can pick
 * IDs to set as HEYGEN_AVATAR_ID and HEYGEN_VOICE_ID.
 *
 * Run with: HEYGEN_API_KEY=sk_... npx tsx server/scripts/list-heygen-avatars.ts
 *
 * Docs: https://developers.heygen.com/docs/quick-start
 */

async function main(): Promise<void> {
  const apiKey = process.env.HEYGEN_API_KEY;
  if (!apiKey) {
    console.error("Missing HEYGEN_API_KEY env var.");
    process.exit(1);
  }

  console.log("Fetching avatar looks...");
  const looksRes = await fetch("https://api.heygen.com/v3/avatars/looks", {
    headers: { "X-Api-Key": apiKey },
  });
  if (!looksRes.ok) {
    console.error(`avatars/looks ${looksRes.status}: ${await looksRes.text()}`);
  } else {
    const looksJson = await looksRes.json();
    const items: Array<{ avatar_id?: string; id?: string; name?: string; gender?: string }> =
      looksJson?.data?.avatars ?? looksJson?.data ?? [];
    for (const a of items.slice(0, 50)) {
      console.log(
        `AVATAR  id=${a.avatar_id ?? a.id ?? "?"}  name=${a.name ?? ""}  gender=${a.gender ?? ""}`,
      );
    }
    console.log(`(${items.length} total avatar looks)`);
  }

  console.log("\nFetching voices...");
  const voicesRes = await fetch("https://api.heygen.com/v3/voices", {
    headers: { "X-Api-Key": apiKey },
  });
  if (!voicesRes.ok) {
    console.error(`voices ${voicesRes.status}: ${await voicesRes.text()}`);
  } else {
    const voicesJson = await voicesRes.json();
    const items: Array<{
      voice_id?: string;
      id?: string;
      name?: string;
      gender?: string;
      language?: string;
    }> = voicesJson?.data?.voices ?? voicesJson?.data ?? [];
    for (const v of items.slice(0, 50)) {
      console.log(
        `VOICE   id=${v.voice_id ?? v.id ?? "?"}  name=${v.name ?? ""}  lang=${v.language ?? ""}  gender=${v.gender ?? ""}`,
      );
    }
    console.log(`(${items.length} total voices)`);
  }

  console.log("\nSet HEYGEN_AVATAR_ID and HEYGEN_VOICE_ID in Heroku Config Vars.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
