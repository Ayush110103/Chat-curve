import fetch from "node-fetch";

const PINECONE_API_KEY = process.env.PINECONE_API_KEY;

if (!PINECONE_API_KEY) {
  throw new Error("PINECONE_API_KEY is not defined in the environment variables");
}

const PINECONE_INDEX_HOST = "https://chatcurve-yc6354b.svc.aped-4627-b74a.pinecone.io";

async function testConnection() {
  try {
    console.log("🔄 Testing Pinecone connection...");
    const response = await fetch(`${PINECONE_INDEX_HOST}/describe_index_stats`, {
      method: "POST",
      headers: {
        "Api-Key": PINECONE_API_KEY,
      },
    });

    if (response.ok) {
      console.log("✅ Pinecone Connection Successful:", await response.json());
    } else {
      console.error("❌ Pinecone Connection Failed:", response.status, response.statusText);
    }
  } catch (error) {
    console.error("🚨 Network error:", error);
  }
}

testConnection();
