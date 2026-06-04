import dotenv from 'dotenv';
dotenv.config();

import cloudinary from 'cloudinary';

const connectCloudinary = () => {
  try {
    cloudinary.v2.config({  
      cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
      api_key: process.env.CLOUDINARY_API_KEY,
      api_secret: process.env.CLOUDINARY_API_SECRET
    });
    console.log("Cloudinary configured successfully");
  } catch (error) {
    console.error("Error connecting to Cloudinary:", error);
  }
};

export default connectCloudinary;