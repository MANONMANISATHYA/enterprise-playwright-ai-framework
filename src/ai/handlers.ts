import { FAILURE_ANALYSIS_TASK, offlineFailureAnalysis } from './failure-analysis';
import { LOCATOR_REPAIR_TASK, offlineLocatorRepair } from './locator-repair';
import type { OfflineHandler } from './offline';
import { offlineTestGeneration, TEST_GENERATION_TASK } from './test-generation';

/** Every task the offline provider can answer. */
export const offlineHandlers: ReadonlyMap<string, OfflineHandler> = new Map<string, OfflineHandler>(
  [
    [FAILURE_ANALYSIS_TASK, offlineFailureAnalysis],
    [TEST_GENERATION_TASK, offlineTestGeneration],
    [LOCATOR_REPAIR_TASK, offlineLocatorRepair],
  ],
);
