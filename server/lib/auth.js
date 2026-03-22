import jwt from "jsonwebtoken";
import { JWT_SECRET } from "../config.js";

export const parseAuthUser = (req) => {
  if (req.user) {
    return req.user;
  }
  const auth = req.headers.authorization || "";
  const [, token] = auth.split(" ");
  if (!token) {
    return null;
  }
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (err) {
    return null;
  }
};
