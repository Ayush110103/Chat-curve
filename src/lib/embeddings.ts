
import dotenv from "dotenv";

// Load environment variables from the .env file
dotenv.config();
import { OpenAIApi, Configuration } from "openai-edge";

const config = new Configuration({
  apiKey: process.env.OPENAI_API_KEY,
});

const openai = new OpenAIApi(config);

export async function getEmbeddings(text: string) {
  try {
    const response = await openai.createEmbedding({
      model: "text-embedding-ada-002",
      input: text.replace(/\n/g, " "),
    });

    const result = await response.json();
    
    if (!result?.data || !Array.isArray(result.data) || result.data.length === 0) {
      throw new Error("Unexpected response structure from OpenAI.");
    }

    return result.data[0].embedding as number[];
  } catch (error) {
    console.log("Error calling OpenAI embeddings API:", error);
    return null;
  }
}
