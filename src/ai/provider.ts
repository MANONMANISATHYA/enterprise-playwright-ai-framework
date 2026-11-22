import { AnthropicProvider } from './anthropic';
import { OfflineProvider } from './offline';

/**
 * The AI layer talks to a provider through this one interface. A provider returns text and nothing
 * else: it never runs code, writes files or changes tests. Callers must validate what comes back.
 */

export interface AiRequest {
  /** Names the job, for example "failure-analysis". The offline provider picks its handler by this. */
  task: string;
  system: string;
  prompt: string;
}

export interface AiProvider {
  readonly name: string;
  complete(request: AiRequest): Promise<string>;
}

export interface AiSettings {
  AI_PROVIDER: 'offline' | 'anthropic';
  ANTHROPIC_API_KEY?: string | undefined;
  AI_MODEL?: string | undefined;
}

export function createProvider(settings: AiSettings): AiProvider {
  if (settings.AI_PROVIDER === 'offline') return new OfflineProvider();

  const apiKey = settings.ANTHROPIC_API_KEY?.trim();
  const model = settings.AI_MODEL?.trim();
  if (!apiKey) throw new Error('AI_PROVIDER=anthropic needs ANTHROPIC_API_KEY in your .env file.');
  if (!model) throw new Error('AI_PROVIDER=anthropic needs AI_MODEL in your .env file.');
  return new AnthropicProvider({ apiKey, model });
}
