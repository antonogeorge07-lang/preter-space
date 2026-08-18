import { createServerFn } from "@tanstack/react-start";

/**
 * ICE server configuration for WebRTC calls.
 *
 * TURN relaying is what makes calls connect on restrictive/mobile networks.
 * Credentials stay on the server: the client only ever receives short-lived or
 * project-scoped values.
 *
 * Supported configurations, in priority order:
 *  1. Cloudflare Realtime TURN (CLOUDFLARE_TURN_KEY_ID + CLOUDFLARE_TURN_API_TOKEN)
 *     -> mints credentials valid for a few hours.
 *  2. Static TURN credentials (TURN_URLS, TURN_USERNAME, TURN_CREDENTIAL).
 *  3. Public STUN + the open relay fallback (best effort).
 */
const STUN_SERVERS = [
  { urls: "stun:stun.l.google.com:19302" },
  { urls: "stun:stun1.l.google.com:19302" },
  { urls: "stun:stun.cloudflare.com:3478" },
];

const FALLBACK_TURN = [
  {
    urls: [
      "turn:openrelay.metered.ca:80",
      "turn:openrelay.metered.ca:443",
      "turn:openrelay.metered.ca:443?transport=tcp",
    ],
    username: "openrelayproject",
    credential: "openrelayproject",
  },
];

type IceServer = { urls: string | string[]; username?: string; credential?: string };

async function cloudflareTurn(keyId: string, apiToken: string): Promise<IceServer[] | null> {
  try {
    const res = await fetch(
      `https://rtc.live.cloudflare.com/v1/turn/keys/${keyId}/credentials/generate-ice-servers`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ ttl: 86400 }),
      },
    );
    if (!res.ok) return null;
    const json = (await res.json()) as { iceServers?: IceServer | IceServer[] };
    const servers = json.iceServers;
    if (!servers) return null;
    return Array.isArray(servers) ? servers : [servers];
  } catch {
    return null;
  }
}

export const getIceServers = createServerFn({ method: "GET" }).handler(async () => {
  const keyId = process.env["CLOUDFLARE_TURN_KEY_ID"];
  const apiToken = process.env["CLOUDFLARE_TURN_API_TOKEN"];
  if (keyId && apiToken) {
    const servers = await cloudflareTurn(keyId, apiToken);
    if (servers?.length) {
      return { iceServers: [...STUN_SERVERS, ...servers], source: "cloudflare" as const };
    }
  }

  const urls = process.env["TURN_URLS"];
  const username = process.env["TURN_USERNAME"];
  const credential = process.env["TURN_CREDENTIAL"];
  if (urls && username && credential) {
    return {
      iceServers: [
        ...STUN_SERVERS,
        {
          urls: urls
            .split(",")
            .map((u) => u.trim())
            .filter(Boolean),
          username,
          credential,
        },
      ],
      source: "static" as const,
    };
  }

  return { iceServers: [...STUN_SERVERS, ...FALLBACK_TURN], source: "fallback" as const };
});
