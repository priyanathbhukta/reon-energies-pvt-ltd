import dotenv from 'dotenv';
import { v2 as cloudinary } from 'cloudinary';
dotenv.config();

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

async function test() {
  try {
    const resRaw = await cloudinary.uploader.upload('./pdfs/test.pdf', {
      folder: 'reon_quotations',
      resource_type: 'raw',
      public_id: 'test_raw'
    });
    console.log('Raw URL:', resRaw.secure_url);

    const resImg = await cloudinary.uploader.upload('./pdfs/test.pdf', {
      folder: 'reon_quotations',
      resource_type: 'image',
      public_id: 'test_img'
    });
    console.log('Image URL:', resImg.secure_url);

    // Test Signed URL
    const signedRawUrl = cloudinary.url('reon_quotations/test_raw.pdf', {
      resource_type: 'raw',
      sign_url: true,
      secure: true
    });
    console.log('Signed Raw URL:', signedRawUrl);
  } catch (err) {
    console.error(err);
  }
}
test();
