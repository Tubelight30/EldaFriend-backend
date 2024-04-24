import { Request, Response, Router } from "express";
import {
  createUser,
  getUser,
  getUserDetails,
  verifyOtp,
} from "../services/authentication.services";

import parsePhoneNumberFromString from "libphonenumber-js";
import { userLoginSchema, userSchema } from "../validations/user.validation";

const router = Router();

router.get("/", async (req: Request, res: Response) => {
  res.status(200).json({ message: "Hello from /api/auth" });
});

router.post("/sign-up/getOtp", async (req: Request, res: Response) => {
  try {
    const { fullname, email, password } = req.body;
    const result = userSchema.safeParse(req.body);

    if (!result.success) {
      return res.status(400).json({
        message: result.error.issues.map((issue) => issue.message).join(","),
      });
    }
    // const phoneNumber = parsePhoneNumberFromString(phone);

    // if (!phoneNumber?.isValid()) {
    //   return res.status(400).json({
    //     message: "Phone number is not valid.",
    //   });
    // }

    const newUser = await createUser({ fullname, email, password });
    if ("error" in newUser) {
      console.log("There was an error:", newUser.message);
      return res.status(newUser.status).send(newUser.message);
    } else {
      return res.status(201).json({
        userId: newUser._id,
        message:
          "An OTP has been successfully sent to your registered email address",
      });
    }
  } catch (error) {
    console.log(error);
    return res.status(500).json({ message: "Internal server error" });
  }
});

router.post("/sign-up/verify-otp", async (req: Request, res: Response) => {
  try {
    const { userId, otp } = req.body;

    const result = await verifyOtp({ userId, otp });
    if ("error" in result) {
      console.log("There was an error:", result.message);
      res.status(result.status).send(result.message);
    } else {
      res.status(200).json({ message: `User verified!` });
    }
  } catch (error) {
    console.log(error);
    return res.status(500).json({ message: "Internal server error" });
  }
});

router.post("/login", async (req: Request, res: Response) => {
  try {
    const result = userLoginSchema.safeParse(req.body);
    if (result.success) {
      const { email, password } = result.data;
      const loggedInUserId = await getUser(email, password);

      if (!loggedInUserId) {
        return res.status(400).send("User not found");
      }

      if ("error" in loggedInUserId) {
        return res.status(loggedInUserId.status).send(loggedInUserId.message);
      }

      return res.status(200).send(loggedInUserId);
    }
  } catch (error) {
    console.log(error);
  }
});

router.get("/user-details", async (req: Request, res: Response) => {
  try {
    const userId = Array.isArray(req.headers["user-id"])
      ? req.headers["user-id"][0]
      : req.headers["user-id"];
    if (userId === "") {
      return res.status(422).send("Send the UID");
    }
    if (userId !== undefined) {
      const user = await getUserDetails(userId);
      if ("error" in user) {
        return res.status(user.status).send(user.message);
      }
      return res.status(200).send(user);
    }
  } catch (error) {
    return res.status(500).send("Internal Server Error");
  }
});
module.exports = router;
