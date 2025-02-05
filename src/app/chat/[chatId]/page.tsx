import ChatComponent from "@/components/ChatComponent";
import ChatSideBar from "@/components/ChatSideBar";
import PDFViewer from "@/components/PDFViewer";
import { db } from "@/lib/db";
import { chats } from "@/lib/db/schema";
import { checkSubscription } from "@/lib/subscription";
import { auth } from "@clerk/nextjs/server";
import { eq } from "drizzle-orm";
import { redirect, notFound } from "next/navigation";
import { Suspense } from "react";

type Props = {
  params: { chatId?: string }; // Make `chatId` optional to avoid crashes
};

const ChatPage = async ({ params }: Props) => {
  // ✅ Ensure params are available before using them
  const awaitedParams = await params;
  if (!awaitedParams || !awaitedParams.chatId) {
    return notFound(); // Show 404 page if no chatId
  }

  // ✅ Safely parse `chatId`
  const chatId = Number(awaitedParams.chatId);
  if (isNaN(chatId)) {
    return redirect("/?error=invalid-chat-id");
  }

  // ✅ Authenticate user
  const { userId } = await auth();
  if (!userId) {
    return redirect("/sign-in");
  }

  // ✅ Fetch user's chats
  const userChats = await db.select().from(chats).where(eq(chats.userId, userId));
  if (!userChats || userChats.length === 0) {
    return redirect("/?error=no-chats");
  }

  // ✅ Validate if the chat belongs to the user
  const currentChat = userChats.find((chat) => chat.id === chatId);
  if (!currentChat) {
    return notFound(); // Show 404 if chat not found
  }

  // ✅ Check user subscription
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
          <Suspense fallback={<div>Loading Chat...</div>}>
            <ChatComponent chatId={chatId} />
          </Suspense>
        </div>
      </div>
    </div>
  );
};

export default ChatPage;