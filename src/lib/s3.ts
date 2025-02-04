import { PutObjectCommand, S3 } from "@aws-sdk/client-s3";

export async function uploadToS3(
  file: File
): Promise<{ file_key: string; file_name: string }> {
  try {
    const s3 = new S3({
      region: "ap-south-1",
      credentials: {
        accessKeyId: process.env.NEXT_PUBLIC_S3_ACCESS_KEY_ID!,
        secretAccessKey: process.env.NEXT_PUBLIC_S3_SECRET_ACCESS_KEY!,
      },
    });
    console.log(process.env.NEXT_PUBLIC_S3_ACCESS_KEY_ID);

    const file_key = `uploads/${Date.now()}-${file.name.replace(/\s+/g, "-")}`;

    const arrayBuffer = await file.arrayBuffer(); // Convert file to array buffer
    const uint8Array = new Uint8Array(arrayBuffer); // Convert to Uint8Array (valid Body type)

    const params = {
      Bucket: process.env.NEXT_PUBLIC_S3_BUCKET_NAME!,
      Key: file_key,
      Body: uint8Array, // ✅ Corrected Body type
      ContentType: file.type, // Ensure correct file type
    };

    await s3.send(new PutObjectCommand(params));

    return { file_key, file_name: file.name };
  } catch (error) {
    console.error("Error uploading to S3:", error);
    throw error;
  }
}

export function getS3Url(file_key: string) {
  return `https://${process.env.NEXT_PUBLIC_S3_BUCKET_NAME}.s3.ap-south-1.amazonaws.com/${file_key}`;
}
