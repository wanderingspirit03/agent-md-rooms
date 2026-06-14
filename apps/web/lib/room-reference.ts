export interface WebRoomAccess {
  roomId: string;
  roomSecret: string;
  appUrl: string;
  syncUrl: string;
}

export function createWebRoomToken(access: WebRoomAccess) {
  return `fold:v1:${base64UrlEncode(JSON.stringify({
    v: 1,
    roomId: access.roomId,
    roomSecret: access.roomSecret,
    appUrl: access.appUrl,
    syncUrl: access.syncUrl,
  }))}`;
}

export function createWebRoomUrl(access: WebRoomAccess) {
  return `${access.appUrl.replace(/\/$/, "")}/room/${encodeURIComponent(access.roomId)}#key=${encodeURIComponent(access.roomSecret)}`;
}

function base64UrlEncode(value: string) {
  const bytes = new TextEncoder().encode(value);
  const binary = Array.from(bytes, (byte) => String.fromCharCode(byte)).join("");
  return globalThis.btoa(binary)
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}
