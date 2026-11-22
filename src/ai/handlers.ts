import { FAILURE_ANALYSIS_TASK, offlineFailureAnalysis } from './failure-analysis';
import type { OfflineHandler } from './offline';

/** Every task the offline provider can answer. Later AI features add their handler here. */
export const offlineHandlers: ReadonlyMap<string, OfflineHandler> = new Map<string, OfflineHandler>(
  [[FAILURE_ANALYSIS_TASK, offlineFailureAnalysis]],
);
