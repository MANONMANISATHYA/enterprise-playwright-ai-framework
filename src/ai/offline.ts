import type { AiProvider, AiRequest } from './provider';

export type OfflineHandler = (request: AiRequest) => string;

/**
 * A provider that never leaves the machine. Each task gets a deterministic handler written in code,
 * so the AI layer can run, be tested and be evaluated without a key or a network.
 */
export class OfflineProvider implements AiProvider {
  readonly name = 'offline';

  constructor(private readonly handlers: ReadonlyMap<string, OfflineHandler> = new Map()) {}

  complete(request: AiRequest): Promise<string> {
    const handler = this.handlers.get(request.task);
    if (!handler) {
      return Promise.reject(
        new Error(`The offline provider has no handler for task "${request.task}".`),
      );
    }
    return Promise.resolve(handler(request));
  }
}
