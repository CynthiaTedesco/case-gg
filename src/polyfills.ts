import { randomUUID } from 'expo-crypto';

// api.ts calls crypto.randomUUID(). Hermes (iOS/Android) has no global crypto, and browsers only
// expose randomUUID on secure origins (so not on http://192.168.x.x when testing on a phone).
const g = globalThis as { crypto?: Partial<Crypto> };

g.crypto ??= {};
g.crypto.randomUUID ??= randomUUID as Crypto['randomUUID'];
