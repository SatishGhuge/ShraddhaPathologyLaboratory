import express from "express";
import {
  getFieldConfigurations,
  getFormattingConfiguration,
  saveFieldConfigurations,
  saveFormattingConfiguration,
  getAllSettings,
  saveAllSettings,
  resetToDefaults,
  updateFieldConfiguration,
} from "../controllers/report-settings.controller.js";

const router = express.Router();

// Get endpoints
router.get("/fields", getFieldConfigurations);
router.get("/formatting", getFormattingConfiguration);
router.get("/", getAllSettings);

// Save endpoints
router.post("/fields", saveFieldConfigurations);
router.post("/formatting", saveFormattingConfiguration);
router.post("/", saveAllSettings);
router.post("/reset", resetToDefaults);

// Update single field
router.patch("/fields/:fieldKey", updateFieldConfiguration);

export default router;
