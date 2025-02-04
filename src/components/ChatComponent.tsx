"use client";
import React from "react";
import { Input } from "./ui/input";
import { useChat } from "ai/react";
import { Button } from "./ui/button";
import { Send } from "lucide-react";
import MessageList from "./MessageList";
import { useQuery } from "@tanstack/react-query";
import axios from "axios";
import { Message } from "ai";

type Props = { chatId: number };

const ChatComponent = ({ chatId }: Props) => {
  const { data, isLoading } = useQuery({
    queryKey: ["chat", chatId],
    queryFn: async () => {
      const response = await axios.post<Message[]>("/api/get-messages", {
        chatId,
      });
      return response.data;
    },
  });

  const { input, handleInputChange, handleSubmit, messages } = useChat({
    api: "/api/chat",
    body: {
      chatId,
    },
    initialMessages: data || [],
  });

  React.useEffect(() => {
    const messageContainer = document.getElementById("message-container");
    if (messageContainer) {
      messageContainer.scrollTo({
        top: messageContainer.scrollHeight,
        behavior: "smooth",
      });
    }
  }, [messages]);

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="sticky top-0 inset-x-0 p-4 bg-blue-600 text-white shadow-md">
        <h3 className="text-2xl font-bold">Chat</h3>
      </div>

      {/* Message List */}
      <div
        id="message-container"
        className="flex-1 overflow-y-auto p-4 bg-gray-100"
      >
        <MessageList messages={messages} isLoading={isLoading} />
      </div>

      {/* Input Form */}
      <form
        onSubmit={handleSubmit}
        className="sticky bottom-0 inset-x-0 px-4 py-3 bg-white shadow-md"
      >
        <div className="flex items-center">
          <Input
            value={input}
            onChange={handleInputChange}
            placeholder="Ask any question..."
            className="w-full text-lg"
          />
          <Button className="bg-blue-600 text-white ml-4 px-6 py-3 text-lg flex items-center">
            <Send className="h-5 w-5 mr-2" />
            Send
          </Button>
        </div>
      </form>
    </div>
  );
};

export default ChatComponent;
