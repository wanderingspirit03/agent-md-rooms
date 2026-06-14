import { describe, expect, it } from "vitest";

import { createWebRoomToken, createWebRoomUrl } from "../../apps/web/lib/room-reference.js";
import { parseRoomReference } from "../rooms/room-reference.js";

describe("web room reference helpers", () => {
  const access = {
    roomId: "room with spaces",
    roomSecret: "client-side-secret",
    appUrl: "https://fold.example",
    syncUrl: "https://sync.fold.example",
  };

  it("creates fold tokens compatible with the CLI parser", () => {
    const parsed = parseRoomReference(createWebRoomToken(access));

    expect(parsed.roomId).toBe(access.roomId);
    expect(parsed.roomSecret).toBe(access.roomSecret);
    expect(parsed.appUrl).toBe(access.appUrl);
    expect(parsed.syncUrl).toBe(access.syncUrl);
  });

  it("creates room URLs with key material only in the fragment", () => {
    const url = createWebRoomUrl(access);

    expect(url).toBe("https://fold.example/room/room%20with%20spaces#key=client-side-secret");
    expect(new URL(url).pathname).toBe("/room/room%20with%20spaces");
    expect(new URL(url).search).toBe("");
  });
});
