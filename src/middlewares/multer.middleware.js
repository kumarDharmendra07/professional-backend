import multer from "multer";
import fs from "fs/promises"
import path from "path"

const uploadPath = path.join(
    process.cwd(),
    "public",
    "temp",
    "uploads"
)

try {
    await fs.mkdir(uploadPath, {recursive:true})
} catch (error) {
    throw new Error(`error while creating upload path : ${error.message}`)
}

const storage = multer.diskStorage(
    {
        destination: function(req, file, cb){
            cb(null, uploadPath)
        },
    
        filename: function(req, file, cb){
            cb(null, Date.now() + "-" + file.originalname)
        }
    }
)

export const upload = multer(
    {
        storage:storage,
        limits: {
            fileSize: 5*1024*1024
        }
        //we also can set filter, that what kind of data we want to allow to upload
    }
)