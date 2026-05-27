export interface VideoProvider {
  isEnabled(): boolean;
  generateVideo(opts: { script: string; callbackId: string }): Promise<{ videoId: string }>;
}

const DEFAULT_AVATAR_ID = "Daisy-inskirt-20220818";
const DEFAULT_VOICE_ID = "2d5b0e6cf36f460aa7fc47e3eee4ba54";
const HEYGEN_API_URL = "https://api.heygen.com/v3/videos";

export class HeyGenProvider implements VideoProvider {
  constructor(
    private apiKey: string,
    private avatarId: string,
    private voiceId: string,
    private baseUrl: string,
  ) {}

  isEnabled(): boolean {
    return true;
  }

  async generateVideo(opts: {
    script: string;
    callbackId: string;
  }): Promise<{ videoId: string }> {
    const callbackUrl = `${this.baseUrl.replace(/\/$/, "")}/api/webhooks/heygen`;
    const body = {
      type: "avatar",
      avatar_id: this.avatarId,
      voice_id: this.voiceId,
      script: opts.script,
      callback_url: callbackUrl,
      callback_id: opts.callbackId,
    };

    const res = await fetch(HEYGEN_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Api-Key": this.apiKey,
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(`HeyGen ${res.status}: ${text || res.statusText}`);
    }

    const json = (await res.json()) as { data?: { video_id?: string } };
    const videoId = json?.data?.video_id;
    if (!videoId) {
      throw new Error("HeyGen response missing video_id");
    }
    return { videoId };
  }
}

export class NullProvider implements VideoProvider {
  isEnabled(): boolean {
    return false;
  }
  async generateVideo(): Promise<{ videoId: string }> {
    throw new Error("Video provider disabled");
  }
}

function buildProvider(): VideoProvider {
  const apiKey = process.env.HEYGEN_API_KEY;
  const disabled = process.env.DISABLE_VIDEO === "true";
  if (!apiKey || disabled) return new NullProvider();
  const avatarId = process.env.HEYGEN_AVATAR_ID || DEFAULT_AVATAR_ID;
  const voiceId = process.env.HEYGEN_VOICE_ID || DEFAULT_VOICE_ID;
  const baseUrl =
    process.env.APP_BASE_URL || "https://claude-climate-game-7292a5cc6677.herokuapp.com";
  return new HeyGenProvider(apiKey, avatarId, voiceId, baseUrl);
}

export const videoProvider: VideoProvider = buildProvider();
