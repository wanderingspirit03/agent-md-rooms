import { createHash } from 'node:crypto';

export type ParticipantKind = 'human' | 'agent';

export interface RoomPersona {
  schema: 'fold.persona.v1';
  id: string;
  kind: ParticipantKind;
  name: string;
  label: 'Human' | 'Agent';
  color: string;
  participantFingerprint: string;
}

export interface AssignPersonaOptions {
  roomId: string;
  participantKind: ParticipantKind;
  participantFingerprint: string;
}

const AGENT_NAME_PREFIXES = [
  'Patch',
  'Diff',
  'Merge',
  'Token',
  'Branch',
  'Commit',
] as const;

const AGENT_NAME_SUFFIXES = [
  'Pilot',
  'Lantern',
  'Signal',
  'Loom',
  'Atlas',
  'Beacon',
  'Relay',
  'Compass',
  'Anchor',
  'Marker',
] as const;

const HUMAN_NAME_PREFIXES = [
  'Reader',
  'Editor',
  'Reviewer',
  'Writer',
  'Archivist',
  'Curator',
] as const;

const HUMAN_NAME_SUFFIXES = [
  'North',
  'Vale',
  'Stone',
  'Quinn',
  'Reed',
  'Lane',
  'Hale',
  'Rowe',
  'Wynn',
  'Gray',
] as const;

const COLORS = [
  '#1e3a8a',
  '#0f766e',
  '#15803d',
  '#b45309',
  '#be123c',
  '#0369a1',
  '#334155',
  '#4338ca',
] as const;

export function assignPersona(options: AssignPersonaOptions): RoomPersona {
  const seed = `${options.roomId}\0${options.participantKind}\0${options.participantFingerprint}`;
  const digest = createHash('sha256').update(seed).digest();
  const name = options.participantKind === 'agent'
    ? personaName(AGENT_NAME_PREFIXES, AGENT_NAME_SUFFIXES, digest[0], digest[2])
    : personaName(HUMAN_NAME_PREFIXES, HUMAN_NAME_SUFFIXES, digest[0], digest[2]);
  const color = COLORS[digest[1] % COLORS.length] ?? COLORS[0];
  const id = createHash('sha256')
    .update(`persona\0${seed}`)
    .digest('hex')
    .slice(0, 24);

  return {
    schema: 'fold.persona.v1',
    id,
    kind: options.participantKind,
    name,
    label: options.participantKind === 'agent' ? 'Agent' : 'Human',
    color,
    participantFingerprint: options.participantFingerprint,
  };
}

function personaName(
  prefixes: readonly string[],
  suffixes: readonly string[],
  prefixSeed: number,
  suffixSeed: number,
) {
  const prefix = prefixes[prefixSeed % prefixes.length] ?? prefixes[0];
  const suffix = suffixes[suffixSeed % suffixes.length] ?? suffixes[0];
  return `${prefix} ${suffix}`;
}
