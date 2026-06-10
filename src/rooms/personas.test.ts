import { describe, expect, it } from 'vitest';
import { assignPersona } from './personas.js';

describe('room personas', () => {
  it('assigns stable agent personas from room and participant fingerprint', () => {
    const first = assignPersona({
      roomId: 'room-a',
      participantKind: 'agent',
      participantFingerprint: 'fold-cli:proposal',
    });
    const second = assignPersona({
      roomId: 'room-a',
      participantKind: 'agent',
      participantFingerprint: 'fold-cli:proposal',
    });

    expect(second).toEqual(first);
    expect(first.kind).toBe('agent');
    expect(first.label).toBe('Agent');
    expect(first.name).toMatch(/^(Patch|Diff|Merge|Token|Branch|Commit) (Pilot|Lantern|Signal|Loom|Atlas|Beacon|Relay|Compass|Anchor|Marker)$/);
  });

  it('separates human and agent persona namespaces', () => {
    const base = {
      roomId: 'room-a',
      participantFingerprint: 'same-participant',
    };

    const human = assignPersona({ ...base, participantKind: 'human' });
    const agent = assignPersona({ ...base, participantKind: 'agent' });

    expect(human.kind).toBe('human');
    expect(agent.kind).toBe('agent');
    expect(human.id).not.toBe(agent.id);
    expect(human.label).toBe('Human');
    expect(agent.label).toBe('Agent');
  });

  it('keeps room-sized participant sets visually distinct', () => {
    const humans = Array.from({ length: 12 }, (_, index) => assignPersona({
      roomId: 'room-collab',
      participantKind: 'human',
      participantFingerprint: `web-client-${index}`,
    }));
    const agents = Array.from({ length: 12 }, (_, index) => assignPersona({
      roomId: 'room-collab',
      participantKind: 'agent',
      participantFingerprint: `agent-${index}`,
    }));

    expect(new Set(humans.map((persona) => persona.name)).size).toBeGreaterThanOrEqual(10);
    expect(new Set(agents.map((persona) => persona.name)).size).toBeGreaterThanOrEqual(10);
    expect(new Set([...humans, ...agents].map((persona) => `${persona.kind}:${persona.name}`)).size).toBeGreaterThanOrEqual(20);
  });
});
