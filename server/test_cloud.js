import { v2 as cloudinary } from 'cloudinary';
import dotenv from 'dotenv';
dotenv.config();

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

async function run() {
  try {
    const res = await cloudinary.uploader.upload('d:/reon/server/test.pdf', {
      folder: 'reon_pdfs',
      resource_type: 'raw',
    });
    console.log("Success:", res.secure_url);
  } catch (err) {
    console.error("Error:", err);
  }
}
run();
