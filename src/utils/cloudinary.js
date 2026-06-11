import { v2 as cloudinary } from 'cloudinary';
import fs from "fs/promises"

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_NAME, 
    api_key: process.env.CLOUDINARY_API_KEY, 
    api_secret: process.env.CLOUDINARY_SECRET_KEY 
})

const uploadOnCloudinary = async (localFilePath, folder = "uploads") => {
    try {
        if(!localFilePath){
            throw new Error("local file path is required")
            // return null
        } 
        const cloudinaryResponse = await cloudinary.uploader.upload(
            localFilePath, 
            {
                resource_type: "auto",
                folder
            }
        )
        // console.log("File uploaded successfully", cloudinaryResponse.secure_url)
        await fs.unlink(localFilePath)      //remove local file path after successfull upload
        // return cloudinaryResponse
        return {
            url: cloudinaryResponse.secure_url,
            public_id: cloudinaryResponse.public_id,
            resource_type: cloudinaryResponse.resource_type
        }
    } catch (error) {
        if(localFilePath){
            try {
                await fs.unlink(localFilePath)
            } catch (error) {
                console.log("Error deleting file: ", error.message)
            }
        }
        console.log("cloudinary upload error : ",error)
        return null
    }
}

export { uploadOnCloudinary }




    //!method to upload image to cloudinary by cloudinary uploader
// (async function() {

//     // Configuration
//     cloudinary.config({ 
//         cloud_name: process.env.CLOUDINARY_NAME, 
//         api_key: process.env.CLOUDINARY_API_KEY, 
//         api_secret: process.env.CLOUDINARY_SECRET_KEY 
//     });
    
//     // Upload an image
//      const uploadResult = await cloudinary.uploader
//        .upload(
//            'https://res.cloudinary.com/demo/image/upload/getting-started/shoes.jpg', {
//                public_id: 'shoes',
//            }
//        )
//        .catch((error) => {
//            console.log(error);
//        });
    
//     console.log(uploadResult);
    
//     // Optimize delivery by resizing and applying auto-format and auto-quality
//     const optimizeUrl = cloudinary.url('shoes', {
//         fetch_format: 'auto',
//         quality: 'auto'
//     });
    
//     console.log(optimizeUrl);
    
//     // Transform the image: auto-crop to square aspect_ratio
//     const autoCropUrl = cloudinary.url('shoes', {
//         crop: 'auto',
//         gravity: 'auto',
//         width: 500,
//         height: 500,
//     });
    
//     console.log(autoCropUrl);    
// })();