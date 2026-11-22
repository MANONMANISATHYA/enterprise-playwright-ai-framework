import { z } from 'zod';
import type { AiProvider, AiRequest } from './provider';

/** Minimal slice of fetch that this provider needs, so tests can pass a fake. */
export type FetchLike = (
  url: string,
  init: { method: string; headers: Record<string, string>; body: string },
) => Promise<{ ok: boolean; status: number; json(): Promise<unknown> }>;

export interface AnthropicOptions {
  apiKey: string;
  model: string;
  fetchFn?: FetchLike;
  maxTokens?: number;
}

const responseSchema = z.object({
  content: z.array(z.object({ type: z.string(), text: z.string().optional() })),
});

const MESSAGES_URL = 'https://api.anthropic.com/v1/messages';

export class AnthropicProvider implements AiProvider {
  readonly name = 'anthropic';
  private readonly fetchFn: FetchLike;

  constructor(private readonly options: AnthropicOptions) {
    this.fetchFn = options.fetchFn ?? fetch;
  }

  async complete(request: AiRequest): Promise<string> {
    const response = await this.fetchFn(MESSAGES_URL, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': this.options.apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: this.options.model,
        max_tokens: this.options.maxTokens ?? 1024,
        system: request.system,
        messages: [{ role: 'user', content: request.prompt }],
      }),
    });

    // Never put the key or the request body in an error message.
    if (!response.ok)
      throw new Error(`AI provider request failed (status ${String(response.status)}).`);

    const parsed = responseSchema.safeParse(await response.json());
    if (!parsed.success) throw new Error('AI provider returned a response in an unexpected shape.');

    const text = parsed.data.content
      .filter((block) => block.type === 'text')
      .map((block) => block.text ?? '')
      .join('');
    if (text === '') throw new Error('AI provider returned no text.');
    return text;
  }
}
