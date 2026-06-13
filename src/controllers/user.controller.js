import { asyncHandler } from "../utils/asyncHandler.js";
import { apiError } from "../utils/apiError.js";
import { User } from "../models/User.models.js";
import router from "../rotues/user.routes.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import { apiResponse } from "../utils/apiResponse.js";
import jwt from "jsonwebtoken"


const generateAccessTokenAndRefreshToken = async (user_Id) => {
    try {
        const user = await User.findById(user_Id)
        if(!user){
            throw new apiError(404, "user not found")
        }

        const accessToken = user.generateAccessToken()
        const refreshToken = user.generateRefreshToken()

        user.refreshToken = refreshToken
        await user.save({ validateBeforeSave: false })

        return { accessToken, refreshToken}
    } catch (error) {
        throw new apiError(500, "Error generating access and refresh tokens")
    }
}

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
        new apiResponse(201, createdUser, "user registered successfully")
    )
})

const loginUser = asyncHandler( async (req, res, next) => {
    //take the user email or username and password
    //check if user exists or not
    //match the password
    //send access token and refresh token and success message
    //send these data as cookies

    const {email, username, password} = req.body

    if(!email && !username){
        throw new apiError(400, "email or username is required")
    }
    if(!password){
        throw new apiError(400, "password is required")
    }
    const user = await User.findOne({
        $or: [{email},{username}]
    })

    if(!user){
        throw new apiError(404, "user not found")
    }

    const isPasswordValid = await user.isPasswordCorrect(password)

    if(!isPasswordValid){
        throw new apiError(401, "incorrect password")
    }

    const { accessToken, refreshToken} = await generateAccessTokenAndRefreshToken(user._id)
    
    const loggedUser = await User.findById(user._id).select("-password -refreshToken")

    const cookieOptions = {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production"
    }

    return res
        .status(200)
        .cookie("accessToken", accessToken, cookieOptions)
        .cookie("refreshToken", refreshToken, cookieOptions)
        .json(
            new apiResponse(
                200,
                {
                    user: loggedUser, accessToken, refreshToken
                },
                "user successfully loged in.."
            )
        )

})

const logoutUser = asyncHandler( async (req, res, next) => {
    await User.findByIdAndUpdate(
        req.user._id,
        {
            $set: {
                refreshToken: undefined
            }
        },
        {
            new: true
        }
    )

    const cookieOptions = {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production"
    }

    return res
        .status(200)
        .clearCookie("accessToken", cookieOptions)
        .clearCookie("refreshToken", cookieOptions)
        .json(
            new apiResponse(
                200,
                {},
                "user logged out"
            )
        )
})

const refreshAccessToken = asyncHandler( async (req, res, next) => {
    try {
        const incomingRefreshToken = req.cookie.refreshToken || req.body.refreshToken
    
        if(!incomingRefreshToken){
            throw new apiError(401, "Unauthorized Request")
        }
    
        const decodedToken = jwt.verify(
            incomingRefreshToken,
            process.env.REFRESH_TOKEN
        )
    
        const user = await User.findById(decodedToken?._id)
        if(!user){
            throw new apiError(401, "Invalid refresh token")
        }
    
        if(incomingRefreshToken !== user.refreshToken){
            throw new apiError(401, "Refresh token expired or invalid!")
        }
    
        const cookieOptions = {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production"
        }
    
        const {  accessToken, newRefreshToken} = await generateAccessTokenAndRefreshToken(user._id)
    
        return res
            .status(200)
            .cookie("accessToken", accessToken, cookieOptions)
            .cookie("refreshToken", newRefreshToken, cookieOptions)
            .json(
                new apiResponse(
                    200,
                    {accessToken, refreshToken : newRefreshToken},
                    "access token refreshed"
                )
            )
    } catch (error) {
        throw new apiError(401, error?.message) || "invalid refresh token"
    }
})

const changeCurrentPassword = asyncHandler( async (req, res, next) => {
    const { oldPassword, newPassword } = req.body

    const user = await User.findById(user._id)

    const isPasswordValid = await user.isPasswordCorrect(oldPassword)
    if(!isPasswordValid){
        throw new apiError(
            400,
            "invalid old password"
        )
    }
    user.password = newPassword
    await user.save({validateBeforeSave: true})

    return res
        .status(200)
        .json(
            new apiResponse(
                200,
                {},
                "Password changed"
            )
        )
})

const getCurrentUser = asyncHandler( async (req, res, next) => {
    // const user = await User.findById(user._id).select("-password -refreshToken")     //we actually dont need to do this
    
    return res
        .status(200)
        .json(
            new apiResponse(
                200,
                req.user,
                "current user fetched"
            )
        )
})

const updateAccountDetails = asyncHandler( async (req, res, next) => {
    const { fullname, email } = req.body
    if(!fullname || !email){
        throw new apiError(400, "all field are required")
    }
    const user = await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set:{
                fullname,
                email
            }
        },
        {
            new: true
        }
    ).select("-password")

    return res
        .status(200)
        .json(
            new apiResponse(
                200,
                user,
                "accout details updated successfully"
            )
        )
})

const updateUserAvatar = asyncHandler( async (req, res, next) => {
    const avatarLocalPath = req.file?.path
    if(!avatarLocalPath){
        throw new apiError(400, "avatar is missing")
    }

    const avatar = await uploadOnCloudinary(avatarLocalPath)

    if(!avatar.url){
        throw new apiError(400, "Error while uploading avatar on cloudinary")
    }

    const user = await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set: {
                avatar: avatar.url
            }
        },
        {
            new:true
        }

    ).select("-password")

    return res
        .status(200)
        .json(
            new apiResponse(
                200,
                user,
                "avatar updated"
            )
        )
})

const updateUserCoverImage = asyncHandler( async (req, res, next) => {
    const coverImageLocalPath = req.file?.path
    if(!coverImageLocalPath){
        throw new apiError(400, "cover image is missing")
    }

    const coverImage = await uploadOnCloudinary(coverImageLocalPath)

    if(!coverImage.url){
        throw new apiError(400, "Error while uploading cover image on cloudinary")
    }

    const user = await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set: {
                coverImage: coverImage.url
            }
        },
        {
            new:true
        }

    ).select("-password")

    return res
        .status(200)
        .json(
            new apiResponse(
                200,
                user,
                "cover image updated"
            )
        )
})

export { registerUser, loginUser, logoutUser, refreshAccessToken, changeCurrentPassword, getCurrentUser, updateAccountDetails, updateUserAvatar, updateUserCoverImage }

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