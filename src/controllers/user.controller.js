import { asyncHandler } from "../utils/asyncHandler.js";
import { apiError } from "../utils/apiError.js";
import { User } from "../models/User.models.js";
import router from "../rotues/user.routes.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import { apiResponse } from "../utils/apiResponse.js";

const registerUser = asyncHandler( async (req, res, next) => {
    //!receiving data
    const {fullname, email, username, password} = req.body
    
    //!checking empty fields
    // if(!fullname || !email || !username || !password){
    //     throw new apiError(400, "all fields are required..")
    // }
    //!advance way to check empty fields
    if(              
        [fullname, email, username, password].some((field) => {
            return field?.trim() === ""
        })
    ){
        throw new apiError(400, "all fields are required..")
    }

    //!check if user already exists
    const existedUser = await User.findOne({
        $or: [{email}, {username}]
    })
    if(existedUser){
        throw new apiError(409, "user with email or username already existed")
    }

    //! check for the images (avatar and coverImage)
    const avatarLocalPath = req.files?.avatar[0]?.path
    const coverImageLocalPath = req.files?.coverImage?.[0]?.path    
    if(!avatarLocalPath){
        throw new apiError(400, "avatar is required")
    }

    //! upload images on the cloudinary
    const avatar = await uploadOnCloudinary(avatarLocalPath)
    // const coverImage = await uploadOnCloudinary(coverImageLocalPath)
    const coverImage = coverImageLocalPath? await uploadOnCloudinary(coverImageLocalPath):null
    if(!avatar){
        throw new apiError(400, "avatar is required")
    }

    //!create user object with all the info
    const user = await User.create({
        fullname,
        email,
        username: username.toLowerCase(),
        password,
        avatar: avatar.url,
        coverImage: coverImage?.url || ""
    })

    //!remove sensitive info
    const createdUser = await User.findById(user._id).select("-password -refreshToken")
    if(!createdUser){
        throw new apiError(500, "internal server error while registering user")
    }

    //!sending response
    return res.status(201).json(
        new apiResponse(200, createdUser, "user registered successfully")
    )
})

export { registerUser }

// 1. Receive data from request body
//    - username
//    - email
//    - password
//    - any other fields

// 2. Validate input
//    - Check if all required fields exist
//    - Check if fields are not empty
//    - Check email format (optional)

// 3. Check if user already exists
//    - Search database using email or username

// 4. If user already exists
//    - Return error response
//    - Status code: 409 (Conflict)

// 5. Hash the password
//    - Use bcrypt
//    - Never store plain password

// 6. Create new user object
//    - username
//    - email
//    - hashed password

// 7. Save user in database

// 8. Remove sensitive fields from response
//    - password
//    - refresh token

// 9. Return success response
//    - Status code: 201
//    - User data
//    - Success message

// 10. Handle unexpected errors
//    - Database error
//    - Server error
//    - Return 500 status code