import dotenv from "dotenv";
dotenv.config();

import { Pinecone, PineconeRecord } from "@pinecone-database/pinecone";
import { downloadFromS3 } from "./s3-server";
import { PDFLoader } from "langchain/document_loaders/fs/pdf";
import md5 from "md5";
import {
  Document,
  RecursiveCharacterTextSplitter,
} from "@pinecone-database/doc-splitter";
import { getEmbeddings } from "./embeddings";
import { convertToAscii } from "./utils";

export const getPineconeClient = () => {
  return new Pinecone({
    environment: process.env.PINECONE_ENVIRONMENT!,
    apiKey: process.env.PINECONE_API_KEY!,
  });
};

type PDFPage = {
  pageContent: string;
  metadata: {
    loc: { pageNumber: number };
  };
};

export async function loadS3IntoPinecone(fileKey: string) {
  console.log("📥 Downloading S3 file into the system...");
  const file_name = await downloadFromS3(fileKey);
  if (!file_name) {
    throw new Error("❌ Failed: Could not download from S3.");
  }

  console.log(`📄 Loading PDF into memory: ${file_name}`);
  const loader = new PDFLoader(file_name);
  const pages = (await loader.load()) as PDFPage[];

  // 🔹 Split and Prepare Documents
  const documents = await Promise.all(pages.map(prepareDocument));
  const flatDocuments = documents.flat();

  console.log(`🔍 Processing ${flatDocuments.length} document chunks...`);

  // 🔹 Generate Embeddings
  const vectors = (
    await Promise.all(flatDocuments.map(embedDocument))
  ).filter((v) => v !== null); // Remove failed embeddings

  console.log(`✅ Successfully embedded ${vectors.length}/${flatDocuments.length} document chunks.`);

  if (vectors.length === 0) {
    throw new Error("❌ No valid embeddings generated. Skipping insertion.");
  }

  // 🔹 Insert into Pinecone in Batches
  const batchSize = 50;
  const client = await getPineconeClient();
  const pineconeIndex = await client.index("chatcurve");
  const namespace = pineconeIndex.namespace(convertToAscii(fileKey));

  console.log("🚀 Inserting vectors into Pinecone...");
  for (let i = 0; i < vectors.length; i += batchSize) {
    const batch = vectors.slice(i, i + batchSize);

    try {
      await retryRequest(() => namespace.upsert(batch));
      console.log(`✅ Inserted batch ${i / batchSize + 1}/${Math.ceil(vectors.length / batchSize)}`);
    } catch (error) {
      console.error(`❌ Error inserting batch ${i / batchSize + 1}:`, error);
    }
  }

  console.log("🎯 All vectors successfully inserted into Pinecone.");
  return documents[0];
}

async function embedDocument(doc: Document) {
  try {
    const embeddings = await getEmbeddings(doc.pageContent);
    if (!embeddings || embeddings.length !== 1536) {
      console.error("⚠️ Invalid embedding detected. Skipping...");
      return null;
    }

    const hash = md5(doc.pageContent);
    return {
      id: hash,
      values: embeddings,
      metadata: {
        text: doc.metadata.text,
        pageNumber: doc.metadata.pageNumber,
      },
    } as PineconeRecord;
  } catch (error) {
    console.log("❌ Error embedding document:", error);
    return null;
  }
}

async function retryRequest(fn: Function, retries = 3, delay = 2000) {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      await fn();
      return;
    } catch (error) {
      console.error(`⚠️ Attempt ${attempt} failed:`, error);
      if (attempt === retries) throw error;
      await new Promise((res) => setTimeout(res, delay)); // Wait before retrying
    }
  }
}

export const truncateStringByBytes = (str: string, bytes: number) => {
  const enc = new TextEncoder();
  return new TextDecoder("utf-8").decode(enc.encode(str).slice(0, bytes));
};

async function prepareDocument(page: PDFPage) {
  let { pageContent, metadata } = page;
  pageContent = pageContent.replace(/\n/g, "");

  const splitter = new RecursiveCharacterTextSplitter();
  const docs = await splitter.splitDocuments([
    new Document({
      pageContent,
      metadata: {
        pageNumber: metadata.loc.pageNumber,
        text: truncateStringByBytes(pageContent, 36000),
      },
    }),
  ]);
  return docs;
}
