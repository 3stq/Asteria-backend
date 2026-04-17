import mongoose from "mongoose";
import { LogDebug, LogError } from "../utils/handling/logging";

export function Connect(string: any) {
  try {
    mongoose.connect(string);
    LogDebug("Connected to MongoDB");
  } catch (error) {
    LogError(error);
  }
}
