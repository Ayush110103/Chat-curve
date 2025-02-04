import fetch from "node-fetch";
import dotenv from "dotenv";
dotenv.config();
const PINECONE_API_KEY = process.env.PINECONE_API_KEY;
if (!PINECONE_API_KEY) {
  throw new Error("PINECONE_API_KEY is not defined in the environment variables");
}
const PINECONE_INDEX_HOST = "https://chatcurve-yc6354b.svc.aped-4627-b74a.pinecone.io";

const batchSize = 10; // Reduce if needed

async function queryVector() {
    console.log("🔄 Querying vector...");
  
    try {
      const response = await fetch(`${PINECONE_INDEX_HOST}/query`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Api-Key": PINECONE_API_KEY,
        },
        body: JSON.stringify({
          topK: 3,
          vector: Array(1536).fill(0.1), // Query test vector
          includeValues: true,
        }),
      });
  
      const data = await response.json();
      console.log("✅ Query Vector Response:", data);
    } catch (error) {
      console.error("❌ Error querying vector:", error);
    }
  }
  
  queryVector();  