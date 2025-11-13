/**
 * Bulk Enrollment Lock
 * 
 * Ensures only one bulk recipient enrollment can execute at a time
 * to prevent concurrent requests from reading identical queue state
 * and allocating overlapping slots.
 * 
 * Uses an in-memory mutex for single-server deployments.
 * For multi-server, upgrade to PostgreSQL advisory locks.
 */

class AsyncMutex {
  private locked = false;
  private waitQueue: Array<() => void> = [];
  
  async acquire(): Promise<() => void> {
    if (!this.locked) {
      this.locked = true;
      return () => this.release();
    }
    
    // Wait in queue
    return new Promise<() => void>((resolve) => {
      this.waitQueue.push(() => {
        this.locked = true;
        resolve(() => this.release());
      });
    });
  }
  
  private release(): void {
    const next = this.waitQueue.shift();
    if (next) {
      next();
    } else {
      this.locked = false;
    }
  }
}

export const bulkEnrollmentMutex = new AsyncMutex();
