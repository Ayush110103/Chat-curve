"use client";
import { DrizzleChat } from "@/lib/db/schema";
import Link from "next/link";
import React from "react";
import { Button } from "./ui/button";
import { MessageCircle, PlusCircle } from "lucide-react";
import { cn } from "@/lib/utils";

type Props = {
  chats: DrizzleChat[];
  chatId: number;
  isPro: boolean;
};

const ChatSideBar = ({ chats, chatId, isPro }: Props) => {
  return (
    <div className="w-full h-full overflow-y-auto p-6 text-gray-200 bg-gray-900">
      {/* New Chat Button */}
      <Link href="/">
        <Button className="w-full py-3 border-dashed border-white border text-lg flex items-center justify-center">
          <PlusCircle className="mr-3 w-6 h-6" />
          New Chat
        </Button>
      </Link>

      {/* Chats List */}
      <div className="flex flex-col gap-4 mt-6">
        {chats.map((chat) => (
          <Link key={chat.id} href={`/chat/${chat.id}`}>
            <div
              className={cn(
                "rounded-lg p-4 text-lg flex items-center cursor-pointer transition-all duration-200",
                {
                  "bg-blue-600 text-white shadow-lg": chat.id === chatId,
                  "hover:bg-gray-700 hover:text-white": chat.id !== chatId,
                }
              )}
            >
              <MessageCircle className="mr-3 w-5 h-5" />
              <p className="truncate">{chat.pdfName}</p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
};

export default ChatSideBar;
