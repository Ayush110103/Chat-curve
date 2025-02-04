import ChatComponent from "@/components/ChatComponent";
import ChatSideBar from "@/components/ChatSideBar";
import PDFViewer from "@/components/PDFViewer";
import { db } from "@/lib/db";
import { chats } from "@/lib/db/schema";
import { checkSubscription } from "@/lib/subscription";
import { auth } from "@clerk/nextjs/server";
import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import React from "react";

type Props = {
  params: {
    chatId: string;
  };
};

const ChatPage = async ({ params }: Props) => {
  const chatId = parseInt(params.chatId, 10); // Safely parse `chatId`

  const { userId } = await auth();
  if (!userId) {
    return redirect("/sign-in");
  }

  const userChats = await db.select().from(chats).where(eq(chats.userId, userId));
  if (!userChats || userChats.length === 0) {
    return redirect("/?error=no-chats");
  }

  const currentChat = userChats.find((chat) => chat.id === chatId);
  if (!currentChat) {
    return redirect("/?error=chat-not-found");
  }

  const isPro = await checkSubscription();

  return (
    <div className="flex h-screen">
      <div className="w-1/5 bg-gray-100 border-r border-gray-300 overflow-y-auto">
        <ChatSideBar chats={userChats} chatId={chatId} isPro={isPro} />
      </div>
      <div className="flex flex-1">
        <div className="flex-1 bg-gray-50 overflow-y-auto">
          <PDFViewer pdf_url={currentChat.pdfUrl || ""} />
        </div>
        <div className="w-2/5 border-l border-gray-300 overflow-y-auto bg-white">
          <ChatComponent chatId={chatId} />
        </div>
      </div>
    </div>
  );
};

export default ChatPage;
