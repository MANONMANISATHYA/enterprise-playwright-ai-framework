import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { z } from 'zod';
import { AnthropicProvider, type FetchLike } from '../../src/ai/anthropic';
import { OfflineProvider, type OfflineHandler } from '../../src/ai/offline';
import { AiOutputError, parseAiJson, redact } from '../../src/ai/output';
import { createProvider } from '../../src/ai/provider';
import {
  assertApproved,
  createProposal,
  listProposals,
  readProposal,
  reviewProposal,
} from '../../src/ai/proposals';
import { expect, test } from '../../src/fixtures';

const newDir = (): string => mkdtempSync(join(tmpdir(), 'ai-proposals-'));
const sample = {
  kind: 'failure-analysis' as const,
  provider: 'offline',
  evidence: ['reports/results.json: example test'],
  payload: { category: 'timeout' },
};

test.describe('AI proposals @unit', () => {
  test('a new proposal is saved as pending and can be listed', () => {
    const dir = newDir();

    const created = createProposal(dir, sample);

    expect(created.status).toBe('pending');
    expect(listProposals(dir).map((p) => p.id)).toEqual([created.id]);
    expect(readProposal(dir, created.id).payload).toEqual({ category: 'timeout' });
  });

  test('a proposal can be reviewed once, and only approved ones pass the gate', () => {
    const dir = newDir();
    const approved = createProposal(dir, sample);
    const rejected = createProposal(dir, sample);

    expect(() => assertApproved(readProposal(dir, approved.id))).toThrow(/pending, not approved/);
    reviewProposal(dir, approved.id, 'approved', 'looks right');
    reviewProposal(dir, rejected.id, 'rejected');

    expect(() => assertApproved(readProposal(dir, approved.id))).not.toThrow();
    expect(() => assertApproved(readProposal(dir, rejected.id))).toThrow(/rejected, not approved/);
    expect(() => reviewProposal(dir, approved.id, 'rejected')).toThrow(/already approved/);
    expect(readProposal(dir, approved.id).review?.note).toBe('looks right');
  });

  test('an unknown id is reported clearly', () => {
    expect(() => readProposal(newDir(), 'missing')).toThrow(/No proposal with id "missing"/);
  });
});

test.describe('AI output safety @unit', () => {
  const schema = z.object({ category: z.string(), confidence: z.number() });

  test('valid JSON, with or without code fences, is accepted', () => {
    expect(parseAiJson('{"category":"timeout","confidence":0.5}', schema).category).toBe('timeout');
    expect(parseAiJson('```json\n{"category":"x","confidence":1}\n```', schema).confidence).toBe(1);
  });

  test('invalid JSON and schema mismatches are rejected, never returned', () => {
    expect(() => parseAiJson('not json', schema)).toThrow(AiOutputError);
    expect(() => parseAiJson('{"category":"x"}', schema)).toThrow(/confidence/);
  });

  test('secrets are masked before evidence leaves the machine', () => {
    const text =
      'Authorization: Bearer abc.def-123 password=hunter2 key sk-abcdefghijklmnopqrstuv ok';

    const clean = redact(text);

    expect(clean).not.toContain('abc.def-123');
    expect(clean).not.toContain('hunter2');
    expect(clean).not.toContain('sk-abcdefghijklmnopqrstuv');
    expect(clean).toContain('password=[REDACTED]');
    expect(redact('Expected: 59.98')).toBe('Expected: 59.98');
  });
});

test.describe('AI providers @unit', () => {
  test('the offline provider answers only for tasks it has a handler for', async () => {
    const provider = new OfflineProvider(
      new Map<string, OfflineHandler>([['echo', (request) => request.prompt]]),
    );

    expect(await provider.complete({ task: 'echo', system: '', prompt: 'hi' })).toBe('hi');
    await expect(provider.complete({ task: 'other', system: '', prompt: '' })).rejects.toThrow(
      /no handler for task "other"/,
    );
  });

  test('the hosted provider sends the key as a header and returns the text', async () => {
    const calls: { url: string; headers: Record<string, string>; body: string }[] = [];
    const fakeFetch: FetchLike = (url, init) => {
      calls.push({ url, headers: init.headers, body: init.body });
      return Promise.resolve({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ content: [{ type: 'text', text: '{"ok":true}' }] }),
      });
    };
    const provider = new AnthropicProvider({
      apiKey: 'test-key',
      model: 'test-model',
      fetchFn: fakeFetch,
    });

    const text = await provider.complete({ task: 't', system: 'be brief', prompt: 'question' });

    const [call] = calls;
    expect(text).toBe('{"ok":true}');
    expect(call?.url).toBe('https://api.anthropic.com/v1/messages');
    expect(call?.headers['x-api-key']).toBe('test-key');
    expect(call?.body).not.toContain('test-key');
    expect(JSON.parse(call?.body ?? '{}') as unknown).toMatchObject({
      model: 'test-model',
      system: 'be brief',
    });
  });

  test('a failed request does not leak the key', async () => {
    const failing: FetchLike = () =>
      Promise.resolve({ ok: false, status: 401, json: () => Promise.resolve({}) });
    const provider = new AnthropicProvider({
      apiKey: 'secret-key-123',
      model: 'm',
      fetchFn: failing,
    });

    await expect(provider.complete({ task: 't', system: '', prompt: '' })).rejects.toThrow(
      /status 401/,
    );
    await expect(provider.complete({ task: 't', system: '', prompt: '' })).rejects.not.toThrow(
      /secret-key-123/,
    );
  });

  test('provider selection defaults to offline and asks for what a hosted provider needs', () => {
    expect(createProvider({ AI_PROVIDER: 'offline' }).name).toBe('offline');
    expect(() => createProvider({ AI_PROVIDER: 'anthropic' })).toThrow(/ANTHROPIC_API_KEY/);
    expect(() => createProvider({ AI_PROVIDER: 'anthropic', ANTHROPIC_API_KEY: 'k' })).toThrow(
      /AI_MODEL/,
    );
    expect(
      createProvider({ AI_PROVIDER: 'anthropic', ANTHROPIC_API_KEY: 'k', AI_MODEL: 'm' }).name,
    ).toBe('anthropic');
  });
});
