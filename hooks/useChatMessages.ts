import { useState, useEffect, useCallback, useRef } from "react";
import { FlatList } from "react-native";
import { supabase } from "../lib/mcp-supabase";
import { messageBatchService } from "../services/messageBatchService";

export interface Message {
  id: string;
  text: string;
  sender: "user" | "ai";
  timestamp: Date;
  type?: "text" | "match-card" | "question" | "profile-question";
  data?: any;
}

const MESSAGE_HEIGHT = 80; // Approximate height for getItemLayout optimization

export function useChatMessages(userId: string | null) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const flatListRef = useRef<FlatList>(null);

  const loadMessages = useCallback(async () => {
    if (!userId) return;

    setLoading(true);
    setError(null);

    try {
      const { data, error: fetchError } = await supabase
        .from("ai_chat_history")
        .select("message_data")
        .eq("user_id", userId)
        .order("created_at", { ascending: true });

      if (fetchError) throw fetchError;

      if (data && data.length > 0) {
        const historyMessages = data.map((item, index) => {
          const message = item.message_data as Message;
          if (message.timestamp && typeof message.timestamp === "string") {
            message.timestamp = new Date(message.timestamp);
          }
          // Fix old message IDs that might cause duplicates
          if (
            message.id === "profile-completion" ||
            message.id === "ready-options" ||
            message.id === "completion" ||
            message.id === "welcome-back" ||
            message.id === "no-more-matches"
          ) {
            message.id = `${message.id}-${Date.now()}-${index}-${Math.random()}`;
          }
          return message;
        });

        // Deduplicate messages by ID
        const seenIds = new Set<string>();
        const uniqueMessages = historyMessages
          .reverse()
          .filter((m) => {
            if (seenIds.has(m.id)) {
              return false;
            }
            seenIds.add(m.id);
            return true;
          })
          .reverse();

        setMessages(uniqueMessages);
      }
    } catch (err: any) {
      setError(err.message || "Failed to load messages");
      console.error("Error loading chat history:", err);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  const addMessage = useCallback(
    async (message: Message, saveToHistory = true) => {
      setMessages((prev) => {
        // Check for duplicates
        if (prev.some((m) => m.id === message.id)) {
          return prev;
        }
        return [...prev, message];
      });

      if (saveToHistory && userId) {
        await messageBatchService.queueMessage(userId, message);
      }
    },
    [userId]
  );

  const addMessages = useCallback(
    async (newMessages: Message[], saveToHistory = true) => {
      setMessages((prev) => {
        const existingIds = new Set(prev.map((m) => m.id));
        const uniqueNewMessages = newMessages.filter((m) => !existingIds.has(m.id));
        return [...prev, ...uniqueNewMessages];
      });

      if (saveToHistory && userId) {
        for (const message of newMessages) {
          await messageBatchService.queueMessage(userId, message);
        }
      }
    },
    [userId]
  );

  const clearMessages = useCallback(() => {
    setMessages([]);
  }, []);

  const scrollToBottom = useCallback(() => {
    setTimeout(() => {
      flatListRef.current?.scrollToEnd({ animated: true });
    }, 100);
  }, []);

  const getItemLayout = useCallback(
    (_: any, index: number) => ({
      length: MESSAGE_HEIGHT,
      offset: MESSAGE_HEIGHT * index,
      index,
    }),
    []
  );

  const keyExtractor = useCallback((item: Message) => item.id, []);

  useEffect(() => {
    if (userId) {
      loadMessages();
    }

    // Flush messages on unmount
    return () => {
      messageBatchService.forceFlush();
    };
  }, [userId, loadMessages]);

  return {
    messages,
    loading,
    error,
    addMessage,
    addMessages,
    clearMessages,
    loadMessages,
    scrollToBottom,
    flatListRef,
    getItemLayout,
    keyExtractor,
  };
}
