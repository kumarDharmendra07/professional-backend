import 'dotenv/config'
import connectDB from './db/dataBase.js'
import { app } from './app.js'


connectDB()
.then(() => {

    app.on("error", (error) => {
    console.log("Error : ",error.message)
    throw error
    })

    app.listen(process.env.PORT || 8000, () => {
        console.log(`Server is running at port : ${process.env.PORT}`)
    })
})
.catch((err) => {
    console.log("Database connection error : ", err.message)    
})