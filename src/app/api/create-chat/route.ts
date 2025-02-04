import { db } from "@/lib/db";
import { chats } from "@/lib/db/schema";
import { loadS3IntoPinecone } from "@/lib/pinecone";
import { getS3Url } from "@/lib/s3";
import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

// /api/create-chat
export async function POST(req: Request) {
  try {
    // Step 1: Authentication check
    const { userId } = await auth();
    console.log("User ID:", userId);
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Step 2: Parse JSON body
    const body = await req.json();
    const { file_key, file_name } = body;
    console.log("Received file_key:", file_key);
    console.log("Received file_name:", file_name);

    // Validate input
    if (!file_key || !file_name) {
      return NextResponse.json(
        { error: "Missing file_key or file_name" },
        { status: 400 }
      );
    }

    // Step 3: Load file into Pinecone
    try {
      console.log("Loading file into Pinecone...");
      await loadS3IntoPinecone(file_key);
      console.log("File successfully loaded into Pinecone.");
    } catch (pineconeError) {
      console.error("Error loading into Pinecone:", pineconeError);
      return NextResponse.json(
        { error: "Failed to process file in Pinecone" },
        { status: 500 }
      );
    }

    // Step 4: Insert into the database
    try {
      console.log("Inserting chat data into the database...");
      const chat_id = await db
        .insert(chats)
        .values({
          fileKey: file_key,
          pdfName: file_name,
          pdfUrl: getS3Url(file_key),
          userId,
        })
        .returning({ insertedId: chats.id });

      console.log("Chat inserted with ID:", chat_id);
      return NextResponse.json(
        {
          chat_id: chat_id[0].insertedId,
        },
        { status: 200 }
      );
    } catch (dbError) {
      console.error("Database insert error:", dbError);
      return NextResponse.json(
        { error: "Database error" },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error("Unexpected server error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
