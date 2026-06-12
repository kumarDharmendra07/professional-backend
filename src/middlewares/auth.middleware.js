import { asyncHandler } from "../utils/asyncHandler.js";
import { User } from "../models/User.models.js";
import { apiError } from "../utils/apiError.js";
import jwt from "jsonwebtoken"

const verifyJWT = asyncHandler( async (req, res, next) => {
    //get the access token
   try {
     const token = req.cookies?.accessToken || req.header("Authorization")?.replace("Bearer ", "")
 
     //check if user has access token
     if(!token){
         throw new apiError(401, "Unauthorized Request")
     }
     
    //  let decodedToken
    //  try{
    //      decodedToken = jwt.verify(token, process.env.ACCESS_TOKEN)
    //  }catch(error){
    //     throw new apiError(401, "Invalid or Expired access token")
    //  }

    const decodedToken = jwt.verify(token, process.env.ACCESS_TOKEN)
     const user = await User.findById(decodedToken?._id).select("-password -refreshToken")
 
     if(!user){
         throw new apiError(401, "Invalid access token")
     }
 
     req.user = user
     next()
   } catch (error) {
        throw new apiError(401, error.message || "invalid access token")
   }

})

export { verifyJWT }