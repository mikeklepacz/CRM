export async function processGmailPushNotification(params: {
  body: any;
  emit: (payload: {
    repliesDetected: number;
    recipientsUpdated: number;
    historyId: string;
  }) => void;
}): Promise<void> {
  const { body, emit } = params;
  const { gmailWatchManager } = await import("../gmailWatchManager");
  const { processGmailHistory } = await import("../gmailHistoryService");

  await gmailWatchManager.updateLastPushReceived();

  const pubsubMessage = body?.message;
  if (!pubsubMessage?.data) {
    return;
  }

  const data = Buffer.from(pubsubMessage.data, "base64").toString("utf-8");
  const notification = JSON.parse(data);

  processGmailHistory(notification.historyId)
    .then((result) => {
      if (result.repliesDetected > 0) {
        emit({
          repliesDetected: result.repliesDetected,
          recipientsUpdated: Array.isArray(result.recipientsUpdated)
            ? result.recipientsUpdated.length
            : Number(result.recipientsUpdated || 0),
          historyId: notification.historyId,
        });
      }
    })
    .catch(() => {
      // Silent error handling - errors are handled in processGmailHistory
    });
}

export async function getGmailPushStatus(): Promise<any> {
  const { gmailWatchManager } = await import("../gmailWatchManager");
  return gmailWatchManager.getStatus();
}

export async function startGmailPushWatch(): Promise<any> {
  const { gmailWatchManager } = await import("../gmailWatchManager");
  return gmailWatchManager.watch();
}

export async function stopGmailPushWatch(): Promise<void> {
  const { gmailWatchManager } = await import("../gmailWatchManager");
  await gmailWatchManager.stop();
}
