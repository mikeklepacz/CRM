import { storage } from '../storage';

const MAX_RETRY_ATTEMPTS = 3;
const RETRY_DELAY_BASE_MS = 2000;

export async function handleCallFailure(target: any, error: any): Promise<void> {
  const isRetryable = isRetryableError(error);
  const shouldRetry = isRetryable && target.attemptCount < MAX_RETRY_ATTEMPTS;

  let errorMessage = error.message || 'Unknown error';
  if (error.response?.data?.error) {
    errorMessage = error.response.data.error;
  }

  if (shouldRetry) {
    const retryDelay = RETRY_DELAY_BASE_MS * Math.pow(2, target.attemptCount);
    const nextAttemptAt = new Date(Date.now() + retryDelay);

    await storage.updateCallCampaignTarget(target.id, target.tenantId, {
      targetStatus: 'pending',
      nextAttemptAt,
      lastError: errorMessage,
    });
  } else {
    await storage.updateCallCampaignTarget(target.id, target.tenantId, {
      targetStatus: 'failed',
      lastError: errorMessage,
      nextAttemptAt: null,
    });

    await storage.incrementCampaignCalls(target.campaignId, target.tenantId, 'failed');
  }
}

export function isRetryableError(error: any): boolean {
  if (!error.response) {
    return true;
  }

  const status = error.response.status;

  if (status >= 400 && status < 500) {
    return false;
  }

  if (status >= 500) {
    return true;
  }

  return false;
}
