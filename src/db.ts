import mongoose, {
  Schema,
  Document,
  Types
} from "mongoose";


/* ========================================================= */
/* TASK TYPE */
/* ========================================================= */

export interface ITask {
  _id?: Types.ObjectId;
  title: string;
  completed: boolean;
}


/* ========================================================= */
/* DAILY PROGRESS TYPE */
/* ========================================================= */

export interface IDailyProgress
  extends Document {

  date: string;

  tasks: Types.DocumentArray<
    ITask
  >;
}


/* ========================================================= */
/* TASK SCHEMA */
/* ========================================================= */

const TaskSchema =
  new Schema<ITask>({
    
    title: {
      type: String,
      required: true
    },

    completed: {
      type: Boolean,
      default: false
    }

  });


/* ========================================================= */
/* DAILY PROGRESS SCHEMA */
/* ========================================================= */

const DailyProgressSchema =
  new Schema<IDailyProgress>({

    date: {
      type: String,
      required: true,
      unique: true
    },

    tasks: [
      TaskSchema
    ]

  });


/* ========================================================= */
/* MODEL */
/* ========================================================= */

export const DailyProgress =
  mongoose.model<IDailyProgress>(
    "DailyProgress",
    DailyProgressSchema
  );


/* ========================================================= */
/* DATABASE CONNECTION */
/* ========================================================= */

export async function connectDB() {

  const atlasURI =
    process.env.MONGODB_URI;

  if (!atlasURI) {

    throw new Error(
      "MONGODB_URI is not defined in .env"
    );

  }

  if (
    mongoose.connection.readyState === 0
  ) {

    await mongoose.connect(
      atlasURI
    );

    console.log(
      "MongoDB connected successfully."
    );

  }

}