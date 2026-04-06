import app from "./app.js";
import dotenv from "dotenv";

dotenv.config();

const PORT = Number(process.env.PORT) || 5001;

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Server running on port ${PORT}`);
});
