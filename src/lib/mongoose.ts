import dotenv from "dotenv";
dotenv.config();

import mongoose from "mongoose";

export async function connectToDatabase() {
  mongoose.set("strictQuery", true);

  if (!process.env.MONGODB_URL) {
    return console.log("MISSING MONGODB_URL");
  }
  try {
    await mongoose.connect(
      "mongodb+srv://zeref101:mongopassword@cluster0.ic2cbjb.mongodb.net/",
      {
        dbName: "EldaFriend",
      }
    );
  } catch (error) {
    console.log(error);
  }
}
