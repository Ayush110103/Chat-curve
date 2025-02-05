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
    chatId?: string;
  };
};

const ChatPage = async ({ params }: Props) => {
  if (!params || !params.chatId) {
    return redirect("/?error=invalid-chat-id");
  }

  // Ensure `chatId` is properly parsed
  const chatId = Number(params.chatId);
  if (isNaN(chatId)) {
    return redirect("/?error=invalid-chat-id");
  }

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
      {/* Sidebar */}
      <div className="w-1/5 bg-gray-100 border-r border-gray-300 overflow-y-auto">
        <ChatSideBar chats={userChats} chatId={chatId} isPro={isPro} />
      </div>

      {/* Main Content */}
      <div className="flex flex-1">
        {/* PDF Viewer */}
        <div className="flex-1 bg-gray-50 overflow-y-auto">
          <PDFViewer pdf_url={currentChat.pdfUrl || ""} />
        </div>

        {/* Chat Component */}
        <div className="w-2/5 border-l border-gray-300 overflow-y-auto bg-white">
          <ChatComponent chatId={chatId} />
        </div>
      </div>
    </div>
  );
};

export default ChatPage;
