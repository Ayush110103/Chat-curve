import { Configuration, OpenAIApi } from "openai-edge";
import { Message, OpenAIStream, StreamingTextResponse } from "ai";
import { getContext } from "@/lib/context";
import { db } from "@/lib/db";
import { chats, messages as _messages } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { getPineconeClient } from "@/lib/pinecone";

export const runtime = "nodejs";

const config = new Configuration({
  apiKey: process.env.OPENAI_API_KEY,
});
const openai = new OpenAIApi(config);

const fetchWithRetry = async (fn: () => Promise<any>, retries = 3): Promise<any> => {
  for (let i = 0; i < retries; i++) {
    try {
      return await fn();
    } catch (error) {
      console.warn(`🔄 Retrying Pinecone request... Attempt ${i + 1}`);
      if (i === retries - 1) throw error;
    }
  }
  throw new Error("❌ Failed to connect to Pinecone after retries.");
};

export async function POST(req: Request) {
  try {
    const { messages, chatId } = await req.json();
    const _chats = await db.select().from(chats).where(eq(chats.id, chatId));
    if (_chats.length !== 1) {
      return NextResponse.json({ error: "Chat not found" }, { status: 404 });
    }

    const fileKey = _chats[0].fileKey;
    const lastMessage = messages[messages.length - 1];
    const context = await getContext(lastMessage.content, fileKey);

    const prompt = {
      role: "system",
      content: `AI assistant uses the given CONTEXT BLOCK.
      START CONTEXT BLOCK
      ${context}
      END OF CONTEXT BLOCK`,
    };

    const response = await openai.createChatCompletion({
      model: "gpt-3.5-turbo",
      messages: [
        prompt,
        ...messages.filter((message: Message) => message.role === "user"),
      ],
      stream: true,
    });

    const client = await getPineconeClient();
    const pineconeIndex = await client.index("chatcurve");

    await fetchWithRetry(() => pineconeIndex.upsert([{ id: chatId, values: [0.1, 0.2, 0.3] }]));

    const stream = OpenAIStream(response, {
      onStart: async () => {
        await db.insert(_messages).values({
          chatId,
          content: lastMessage.content,
          role: "user",
        });
      },
      onCompletion: async (completion) => {
        await db.insert(_messages).values({
          chatId,
          content: completion,
          role: "system",
        });
      },
    });

    return new StreamingTextResponse(stream);
  } catch (error) {
    console.error("❌ Error in /api/chat:", error);
    return NextResponse.json({ error: "Failed to connect to Pinecone" }, { status: 500 });
  }
}
