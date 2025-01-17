import Medicine, { IMedicine } from "../database/medicine.model";
import { connectToDatabase } from "../lib/mongoose";
import {
  CreateMedProp,
  Error,
  GetAllMedsProp,
  GetCreateMedicineProp,
  GetMedicineProp,
  UpdateIsCompletedProp,
  UserWithMedNameProp,
} from "../types";
const { differenceInDays } = require("date-fns");

export async function createMedicine({
  userId,
  dosageType,
  medAmount,
  medName,
  duration,
  scheduledTime,
}: GetCreateMedicineProp): Promise<CreateMedProp> {
  try {
    connectToDatabase();

    const now = new Date();
    let scheduledHour;
    let scheduledMinute;
    try {
      scheduledHour = parseInt(scheduledTime.split(":")[0]);
      scheduledMinute = parseInt(scheduledTime.split(":")[1]);
    } catch (error) {
      console.error(error);
      return {
        error: true,
        status: 400,
        message: "Invalid scheduled time format",
      };
    }

    // * SETTING UP THE MEDCINE START DATE
    let medStartDate;

    if (scheduledHour > now.getHours()) {
      medStartDate = now;
    } else if (scheduledHour === now.getHours()) {
      if (scheduledMinute > now.getMinutes()) {
        medStartDate = now;
      } else if (scheduledMinute === now.getMinutes()) {
        const timeGap = 15;
        if (now.getSeconds() + timeGap < 60) {
          medStartDate = now;
        } else {
          medStartDate = new Date(now.setDate(now.getDate() + 1));
        }
      } else {
        medStartDate = new Date(now.setDate(now.getDate() + 1));
      }
    } else {
      medStartDate = new Date(now.setDate(now.getDate() + 1));
    }

    // * SETTING UP THE isCompleted field

    const medIsCompletedArray = new Array(duration * 7).fill(false);

    const newMedicine = await Medicine.create({
      userId: userId,
      name: medName,
      dosageType: dosageType,
      dosageAmount: medAmount,
      duration: duration,
      startDate: medStartDate,
      isCompleted: medIsCompletedArray,
      scheduledTime: scheduledTime,
    });

    if (!newMedicine) {
      return {
        error: true,
        status: 500,
        message: `Medicine creation failed`,
      };
    }

    return newMedicine;
  } catch (error) {
    console.log(error);
    return {
      error: true,
      status: 500,
      message: "Internal server error",
    };
  }
}

export async function updateIsCompleted({
  userId,
  medicineId,
  setTrueForDate,
  setTrue,
}: UpdateIsCompletedProp) {
  try {
    connectToDatabase();
    const med: GetMedicineProp | null = await Medicine.findOne({
      userId,
      _id: medicineId,
    });
    if (med === null) {
      return {
        error: true,
        status: 404,
        message: "Medicine not found",
      };
    }

    // ? Difference between update and startDate
    if (med && med.isCompleted) {
      const index = differenceInDays(setTrueForDate, med.startDate);
      if (index < 0 || index >= med.isCompleted.length) {
        return {
          error: true,
          status: 400,
          message: "Invalid date",
        };
      }
      med.isCompleted[index] = setTrue;
      try {
        await med.save();
        return {
          error: false,
          status: 200,
          message: `Medicine status for today updated`,
        };
      } catch (error) {
        console.log(error);
        return {
          error: true,
          status: 500,
          message: `Internal Server Error while saving the status of medicine`,
        };
      }
    }
  } catch (error) {
    console.log(error);
    return {
      error: true,
      status: 500,
      message: `Internal Server Error`,
    };
  }
}

export async function getAllMedicines(
  userId: string
): Promise<GetAllMedsProp[] | Error> {
  try {
    connectToDatabase();

    const meds = await Medicine.find({ userId }).select(
      "name dosageType dosageAmount scheduledTime"
    );

    if (!meds) {
      return {
        error: true,
        status: 400,
        message: "Medicines not found",
      };
    }

    return meds;
  } catch (error) {
    console.log(error);
    return {
      error: true,
      status: 500,
      message: "Internal Server Error while fetching medicines",
    };
  }
}

export async function getUserMedicineNames(
  userId: string
): Promise<GetAllMedsProp[] | Error> {
  try {
    if (!userId) {
      return {
        error: true,
        status: 400,
        message: "Invalid user ID",
      };
    }
    connectToDatabase();

    const meds = await Medicine.find({ userId }).select("name");

    if (!meds) {
      return {
        error: true,
        status: 400,
        message: "Medicines not found",
      };
    } else if (meds.length > 0) {
      const medNames = meds.map((medicine) => medicine.name);
      return medNames;
    }
    return [];
  } catch (error) {
    console.log(error);
    return {
      error: true,
      status: 500,
      message: "Internal Server Error while fetching medicines",
    };
  }
}

export async function getAllUsersWithMedName(
  medName: string
): Promise<UserWithMedNameProp[] | Error> {
  try {
    connectToDatabase();

    const users = await Medicine.find({ name: medName }).select("userId");

    if (users.length > 0) {
      const userid = users.map((user) => user.userId);
      return userid;
    }

    return [];
  } catch (error) {
    console.log(error);
    return {
      error: true,
      status: 500,
      message: "Internal Server Error",
    };
  }
}
