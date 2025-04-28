export class QueueService<T> {
  private queue: Array<() => Promise<T>> = [];
  private isProcessing: boolean = false;

  async enqueue(operation: () => Promise<T>): Promise<T> {
    return new Promise((resolve, reject) => {
      this.queue.push(async () => {
        try {
          const result = await operation();
          resolve(result);
          return result;
        } catch (error) {
          reject(error);
          throw error;
        }
      });

      if (!this.isProcessing) {
        this.processQueue();
      }
    });
  }

  private async processQueue() {
    if (this.isProcessing || this.queue.length === 0) {
      return;
    }

    this.isProcessing = true;

    try {
      while (this.queue.length > 0) {
        const operation = this.queue.shift();
        if (operation) {
          await operation();
        }
      }
    } finally {
      this.isProcessing = false;
    }
  }

  clear() {
    this.queue = [];
  }

  getQueueLength(): number {
    return this.queue.length;
  }
} 