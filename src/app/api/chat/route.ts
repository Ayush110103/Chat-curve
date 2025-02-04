import { Configuration, OpenAIApi } from "openai-edge";
import { Message, OpenAIStream, StreamingTextResponse } from "ai";
import { getContext } from "@/lib/context";
import { db } from "@/lib/db";
import { chats, messages as _messages } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";

export const runtime = "nodejs"; // Use Node.js runtime

const config = new Configuration({
  apiKey: process.env.OPENAI_API_KEY,
});
const openai = new OpenAIApi(config);

// Retry logic for transient errors
const fetchWithRetry = async (fn: () => Promise<any>, retries = 3): Promise<any> => {
  for (let i = 0; i < retries; i++) {
    try {
      return await fn();
    } catch (error) {
      console.warn(`Retrying request... Attempt ${i + 1}`);
      if (i === retries - 1) throw error;
    }
  }
};

export async function POST(req: Request) {
  try {
    const { messages, chatId } = await req.json();

    // Validate the chat
    const _chats = await db.select().from(chats).where(eq(chats.id, chatId));
    if (_chats.length !== 1) {
      return NextResponse.json({ error: "Chat not found" }, { status: 404 });
    }
    const fileKey = _chats[0].fileKey;

    // Get the last user message and context
    const lastMessage = messages[messages.length - 1];
    const context = await getContext(lastMessage.content, fileKey);

    const prompt = {
      role: "system",
      content: `AI assistant is a brand new, powerful, human-like artificial intelligence.
      AI will take into account any CONTEXT BLOCK that is provided in a conversation.
      START CONTEXT BLOCK
      ${context}
      END OF CONTEXT BLOCK
      `,
    };

    // OpenAI API call with retry logic
    const response = await fetchWithRetry(() =>
      openai.createChatCompletion({
        model: "gpt-3.5-turbo",
        messages: [
          prompt,
          ...messages.filter((message: Message) => message.role === "user"),
        ],
        stream: true,
      })
    );

    // Stream the response back to the client
    const stream = OpenAIStream(response, {
      onStart: async () => {
        // Save the user's message to the database
        await db.insert(_messages).values({
          chatId,
          content: lastMessage.content,
          role: "user",
        });
      },
      onCompletion: async (completion) => {
        // Save the AI's response to the database
        await db.insert(_messages).values({
          chatId,
          content: completion,
          role: "system",
        });
      },
    });

    return new StreamingTextResponse(stream);
  } catch (error) {
    console.error("Error in /api/chat:", error);
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }
}
