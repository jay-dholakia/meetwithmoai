import { supabase } from "../lib/mcp-supabase";

interface Message {
  id: string;
  text: string;
  sender: "user" | "ai";
  timestamp: Date;
  type?: "text" | "match-card" | "question" | "profile-question";
  data?: any;
}

class MessageBatchService {
  private messageQueue: Array<{ userId: string; message: Message }> = [];
  private batchTimeout: NodeJS.Timeout | null = null;
  private readonly BATCH_DELAY = 2000; // 2 seconds
  private readonly MAX_BATCH_SIZE = 10;

  async queueMessage(userId: string, message: Message): Promise<void> {
    this.messageQueue.push({ userId, message });

    // If queue is full, flush immediately
    if (this.messageQueue.length >= this.MAX_BATCH_SIZE) {
      await this.flush();
      return;
    }

    // Otherwise, set a timeout to batch messages
    if (this.batchTimeout) {
      clearTimeout(this.batchTimeout);
    }

    this.batchTimeout = setTimeout(() => {
      this.flush();
    }, this.BATCH_DELAY);
  }

  async flush(): Promise<void> {
    if (this.batchTimeout) {
      clearTimeout(this.batchTimeout);
      this.batchTimeout = null;
    }

    if (this.messageQueue.length === 0) {
      return;
    }

    const messagesToSave = [...this.messageQueue];
    this.messageQueue = [];

    // Group messages by userId for efficient batching
    const messagesByUser = new Map<string, Message[]>();
    for (const { userId, message } of messagesToSave) {
      if (!messagesByUser.has(userId)) {
        messagesByUser.set(userId, []);
      }
      messagesByUser.get(userId)!.push(message);
    }

    // Batch insert for each user
    const insertPromises = Array.from(messagesByUser.entries()).map(
      async ([userId, messages]) => {
        try {
          const records = messages.map((message) => ({
            user_id: userId,
            message_data: message,
          }));

          const { error } = await supabase
            .from("ai_chat_history")
            .insert(records);

          if (error) {
            console.error(`Error batch saving messages for user ${userId}:`, error);
            // Fallback: try saving individually
            for (const message of messages) {
              try {
                await supabase.from("ai_chat_history").insert({
                  user_id: userId,
                  message_data: message,
                });
              } catch (individualError) {
                console.error("Error saving individual message:", individualError);
              }
            }
          }
        } catch (error) {
          console.error("Error in batch insert:", error);
        }
      }
    );

    await Promise.all(insertPromises);
  }

  // Force flush on unmount or when needed
  async forceFlush(): Promise<void> {
    await this.flush();
  }
}

export const messageBatchService = new MessageBatchService();
