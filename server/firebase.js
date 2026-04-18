import admin from 'firebase-admin';
import dotenv from 'dotenv';
dotenv.config();

// Initialize Firebase Admin if not already initialized
if (!admin.apps.length) {
  try {
    // Option A: Use specific service account JSON path if provided
    if (process.env.FIREBASE_SERVICE_ACCOUNT_PATH) {
      admin.initializeApp({
        credential: admin.credential.cert(process.env.FIREBASE_SERVICE_ACCOUNT_PATH),
        storageBucket: process.env.FIREBASE_STORAGE_BUCKET // e.g. "your-project.appspot.com"
      });
    } else {
      // Option B: relies on GOOGLE_APPLICATION_CREDENTIALS environment variable
      admin.initializeApp({
        credential: admin.credential.applicationDefault(),
        storageBucket: process.env.FIREBASE_STORAGE_BUCKET
      });
    }
  } catch (error) {
    console.warn("Firebase Admin Initialization Warning:", error.message);
  }
}

export async function uploadPdfToFirebase(localFilePath, destinationPath) {
  if (!process.env.FIREBASE_STORAGE_BUCKET) {
    throw new Error("FIREBASE_STORAGE_BUCKET is not defined in environment variables");
  }
  
  const bucket = admin.storage().bucket(process.env.FIREBASE_STORAGE_BUCKET);
  
  try {
    const [file] = await bucket.upload(localFilePath, {
      destination: destinationPath,
      metadata: {
        contentType: 'application/pdf',
      },
    });

    // Make the file publicly accessible to get public URL
    await file.makePublic();
    
    const publicUrl = `https://storage.googleapis.com/${bucket.name}/${file.name}`;
    return publicUrl;
  } catch (error) {
    console.error("Firebase upload error:", error);
    throw error;
  }
}
