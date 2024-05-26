import { Request, Response, Router } from "express";
import {
  createMedicine,
  updateIsCompleted,
} from "../services/medicine.services";
import {
  createMedSchema,
  getAllMedsRequest,
  updateIsCompletedSchema,
} from "../validations/medicine.validation";
import User from "../database/user.model";
import Medicine from "../database/medicine.model";
import { connectToDatabase } from "../lib/mongoose";

const router = Router();

router.post("/create-med", async (req: Request, res: Response) => {
  try {
    const result = createMedSchema.safeParse(req.body);

    if (!result.success) {
      console.log(result.error);
      return res.status(400).json({
        message: result.error.issues.map((issue) => issue.message).join(","),
      });
    }

    let { userId, dosageType, medAmount, medName, duration, scheduledTime } =
      result.data;

    scheduledTime = scheduledTime.slice(0, -3);
    const newMedicine = await createMedicine({
      userId,
      dosageType,
      medAmount,
      medName,
      duration,
      scheduledTime,
    });

    if (newMedicine.error) {
      return res.status(400).json({ message: newMedicine.error });
    }
    try {
      await User.findByIdAndUpdate(userId, {
        $push: { medicines: newMedicine._id },
      });
      return res.status(201).json({
        message: "Medicine created successfully",
      });
    } catch (error) {
      console.log(error);
      return res.status(500).json({
        message: "Failed to create Medicine",
      });
    }
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Internal server error" });
  }
});

router.patch("/med-taken", async (req: Request, res: Response) => {
  try {
    const result = updateIsCompletedSchema.safeParse(req.body);
    if (!result.success) {
      res.status(400).json({
        message: result.error.issues.map((issue) => issue.message).join(","),
      });
    } else {
      const { userId, medicineId, setTrueForDate, setTrue } = result.data;

      const updateMedReponse = await updateIsCompleted({
        userId,
        medicineId,
        setTrueForDate,
        setTrue,
      });

      if (updateMedReponse?.error) {
        return res
          .status(updateMedReponse.status)
          .send(updateMedReponse.message);
      }
      return res.sendStatus(204);
    }
  } catch (error) {
    console.error("Error while updating medicine taken status", {
      request: {
        path: req.path,
        method: req.method,
        body: req.body,
      },
      error,
    });

    res.status(500).json({
      message: "Internal Server error while updating the medicine taken status",
    });
  }
});

module.exports = router;

router.get("/getMedicines", async (req: Request, res: Response) => {
  try {
    const result = getAllMedsRequest.safeParse(req.body);
    if (!result.success) {
      res.status(422).json({
        message: result.error.issues.map((issue) => issue.message).join(","),
      });
    } else {
      const { userId } = result.data;
      connectToDatabase();
      const meds = await Medicine.find({
        userId: userId,
      }).select("_id name scheduledTime");
      if (meds.length > 0) {
        return res.status(200).send(meds);
      } else {
        return res.status(204).json({
          message: "No meds",
        });
      }
    }
  } catch (error) {
    return res.status(500).json({
      message: "Internal Server error while getting the Medicines",
    });
  }
});
