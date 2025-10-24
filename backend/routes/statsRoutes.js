// routes/statsRoutes.js
import express from "express";
import { getStats } from "../controller/statsController.js";

const router = express.Router();

router.get("/", getStats);

export default router;
