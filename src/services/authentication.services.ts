import User from "../database/user.model";
import { connectToDatabase } from "../lib/mongoose";
import { hashPassword } from "../lib/util";
import {
  CreateUserAltResponse,
  CreateUserParams,
  CreateUserResponse,
  Error,
  GetUserProp,
} from "../types";
import nodemailer from "nodemailer";
import bcrypt from "bcrypt";
import tempUser from "../database/tempUser.model";

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.SENDER_EMAIL,
    pass: process.env.SENDER_APP_PASSWORD,
  },
  port: 587,
  host: "smtp.gmail.com",
});

export async function createUser({
  fullname,
  email,
  password,
}: Omit<CreateUserParams, "phone">): Promise<
  CreateUserResponse | CreateUserAltResponse
> {
  try {
    connectToDatabase();

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return {
        error: true,
        status: 409,
        message: "Email already exists",
      };
    }

    const hashedPassword = await hashPassword(password);

    // ? GENERATING OTP
    const otp = Math.floor(100000 + Math.random() * 900000);

    const mailOption = {
      from: {
        name: "Shreyas Mohanty",
        address: "shreyasmohanty0228@gmail.com",
      },
      to: email,
      subject: "Your OTP for signup",
      text: "Your OTP is: " + otp,
    };

    const user = await tempUser.create({
      fullname,
      email,
      password: hashedPassword,
      otp,
    });

    transporter.sendMail(mailOption, (error, info) => {
      if (error) {
        console.log({
          error: true,
          status: 500,
          message: "Error while sending the otp via email",
        });
        console.log(error);
      } else {
        console.log({
          error: true,
          status: 200,
          message: "Please check your email for the otp",
        });
      }
    });

    if (!user) {
      return {
        error: true,
        status: 500,
        message: `User not created due to an Internal server error`,
      };
    }

    return user;
  } catch (err) {
    console.error(err);
    return {
      error: true,
      status: 500,
      message: "Internal server error",
    };
  }
}

// export async function createUser({
//   fullname,
//   email,
//   phone,
//   password,
// }: CreateUserParams): Promise<CreateUserResponse | CreateUserAltResponse> {
//   try {
//     connectToDatabase();

//     const existingUser = await User.findOne({ $or: [{ email }, { phone }] });
//     if (existingUser) {
//       if (existingUser.email === email) {
//         return {
//           error: true,
//           status: 409,
//           message: "Email already exists",
//         };
//       } else {
//         return {
//           error: true,
//           status: 409,
//           message: "Phone number already exists",
//         };
//       }
//     }

//     const hashedPassword = await hashPassword(password);

//     // ? GENERATING OTP
//     const otp = Math.floor(100000 + Math.random() * 900000);

//     const mailOption = {
//       from: {
//         name: "Shreyas Mohanty",
//         address: "shreyasmohanty0228@gmail.com",
//       },
//       to: email,
//       subject: "Your OTP for signup",
//       text: "Your OTP is: " + otp,
//     };

//     const user = await tempUser.create({
//       fullname: fullname,
//       email: email,
//       phone: phone,
//       password: hashedPassword,
//       otp: otp,
//     });

//     // const user: any = await User.create({
//     //   fullname: fullname,
//     //   email: email,
//     //   phone: phone,
//     //   password: hashedPassword,
//     //   otp: otp,
//     //   verified: false,
//     //   globalPin: globalPin,
//     // });
//     transporter.sendMail(mailOption, (error, info) => {
//       if (error) {
//         console.log({
//           error: true,
//           status: 500,
//           message: "Error while sending the otp via email",
//         });
//         console.log(error);
//       } else {
//         console.log({
//           error: true,
//           status: 200,
//           message: "Please check your email for the otp",
//         });
//       }
//     });

//     if (!user) {
//       return {
//         error: true,
//         status: 500,
//         message: `User not created due to an Internal server error`,
//       };
//     }

//     return user;
//   } catch (err) {
//     console.error(err);
//     return {
//       error: true,
//       status: 500,
//       message: "Internal server error",
//     };
//   }
// }

export async function verifyOtp({
  userId,
  otp,
}: {
  userId: string;
  otp: number;
}): Promise<CreateUserParams | CreateUserAltResponse> {
  try {
    connectToDatabase();
    // ? GENERATING GLOBAL PIN
    const globalPin = Math.floor(1000 + Math.random() * 9000);

    const tempuser = await tempUser.findById(userId);
    if (!tempuser) {
      return {
        error: true,
        status: 404,
        message: "User not found",
      };
    }

    if (tempuser.otp !== otp) {
      await tempUser.deleteOne({ _id: userId });
      return {
        error: true,
        status: 400,
        message: "Invalid OTP",
      };
    }

    const newUser = await User.create({
      fullname: tempuser.fullname,
      email: tempuser.email,
      password: tempuser.password,
      otp: 0,
      verified: true,
      globalPin: globalPin,
    });

    await tempUser.deleteOne({ _id: userId });

    return {
      error: false,
      status: 201,
      message: "User created successfully",
    };
  } catch (err) {
    console.error(err);
    return {
      error: true,
      status: 500,
      message: "Internal server error",
    };
  }
}

export async function getUser(
  email: string,
  password: string
): Promise<GetUserProp | Error> {
  try {
    connectToDatabase();

    const user = await User.findOne({ email });
    if (!user) {
      return {
        error: true,
        status: 400,
        message: "User not found",
      };
    }

    const isPasswordMatch = await bcrypt.compare(password, user.password);
    if (!isPasswordMatch) {
      return {
        error: true,
        status: 400,
        message: "Invalid password",
      };
    }

    return user._id;
  } catch (error) {
    console.error(error);
    return {
      error: true,
      status: 500,
      message: "Internal server error",
    };
  }
}

export async function getUserDetails(
  userId: string
): Promise<GetUserProp | { error: boolean; status: number; message: string }> {
  try {
    connectToDatabase();

    const user = await User.findOne({ _id: userId }, { password: 0, otp: 0 });
    if (!user) {
      return {
        error: true,
        status: 404,
        message: "User not found",
      };
    }

    return user;
  } catch (error) {
    console.error(error);
    return {
      error: true,
      status: 500,
      message: "Internal server error",
    };
  }
}
