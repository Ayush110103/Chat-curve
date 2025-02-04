import { db } from "@/lib/db";
import { messages } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";

export const runtime = "edge";

export const POST = async (req: Request) => {
  try {
    const { chatId } = await req.json();
    if (!chatId) {
      return NextResponse.json({ error: "Missing chatId" }, { status: 400 });
    }

    console.log(`🔍 Fetching messages for chatId: ${chatId}`);

    const _messages = await db
      .select()
      .from(messages)
      .where(eq(messages.chatId, chatId));

    console.log(`✅ Retrieved ${_messages.length} messages.`);
    return NextResponse.json(_messages);
  } catch (error) {
    console.error("❌ Error in get-messages API:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { error: "Internal Server Error", details: errorMessage },
      { status: 500 }
    );
  }
};
