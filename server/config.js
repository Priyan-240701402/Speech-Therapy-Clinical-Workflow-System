import dotenv from "dotenv";

dotenv.config();

export const PORT = process.env.PORT || 4000;
export const JWT_SECRET = process.env.JWT_SECRET || "priayn_06";
export const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || "8h";
export const CORS_ORIGIN = process.env.CORS_ORIGIN || "";
