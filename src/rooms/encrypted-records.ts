import type { IncomingEncryptedUpdate } from '../server/append-log.js';
import { decryptUpdate, deriveRoomKey, encryptUpdate, type EncryptedPayload } from './crypto.js';
import type { RoomAccess } from './room-reference.js';

export async function encryptJsonRecord(
  access: RoomAccess,
  senderId: string,
  value: unknown,
): Promise<IncomingEncryptedUpdate> {
  const roomKey = await deriveRoomKey(access.roomId, access.roomSecret);
  const encrypted = await encryptUpdate(Buffer.from(JSON.stringify(value), 'utf8'), roomKey, {
    roomId: access.roomId,
    senderId,
  });
  return {
    senderId,
    ...encrypted,
  };
}

export async function decryptJsonRecord(
  access: RoomAccess,
  payload: EncryptedPayload,
  senderId: string,
): Promise<unknown> {
  const roomKey = await deriveRoomKey(access.roomId, access.roomSecret);
  const bytes = await decryptUpdate(payload, roomKey, {
    roomId: access.roomId,
    senderId,
  });
  return JSON.parse(Buffer.from(bytes).toString('utf8')) as unknown;
}
