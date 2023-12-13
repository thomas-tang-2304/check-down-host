import { config } from "dotenv";

const nodeEnv = process.env.NODE_ENV || "";

export const configEnv = () => {
  if (nodeEnv) {
    config({
      path: `./.env.production`,
    });
  } else {
    config();
  }
};
