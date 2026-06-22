/**
 * Seed script – populates the service-categories collection with the
 * official Internal and External services.
 *
 * Usage:  node scripts/seedServiceCategories.js
 *
 * The script is idempotent: existing entries are skipped (matched by name).
 */
import mongoose from "mongoose";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, "../.env") });

import ServiceCategory from "../models/ServiceCategory.js";
import Question from "../models/Question.js";

const INTERNAL_SERVICES = [
  "Provision of Speeches/Messages and Photo/video documentation of EMB Events",
  "Recruitment, Selection and Promotion-Selection and Promotion Board",
  "Nomination for Training/Scholarship Abroad",
  "Procurement of Goods and Services and Procurement Process",
  "Processing of Purchase Request",
  "Bidding Process",
  "Document Tracking Process",
  "Issuance of Order of Payment & Official Receipt and Issuance of Official Receipts",
  "Processing & Issuance of Checks/Preparation of LDDAP-ADA and Facilitating Checks",
  "Endorsement of Payroll Proof List to the Bank",
  "Request for Funding",
  "Issuance of Certificate of Employment",
  "Issuance of Service Record",
  "Leave Application",
];

const EXTERNAL_SERVICES = [
  "Certificate of Conformity (COC)",
  "Third Party Source Emission Testing Firm (3PSETF) Accreditation",
  "Certification of Equipment used for Vehicular Emission Testing",
  "Priority Chemical List (PCL) Certificate",
  "Priority Chemical List (PCL) Exemption",
  "Pre-Manufacturing Pre-Importation Notification (PMPIN) Certification",
  "Polymer Exemption",
  "Chemical Control Order (CCO) for Arsenic (Registration Certificate)",
  "Chemical Control Order (CCO) for Cadmium and Cadmium Compounds (Registration Certificate)",
  "Chemical Control Order (CCO) for Chromium VI Compounds (Registration Certificate)",
  "Chemical Control Order (CCO) for Lead Registration Certificate",
  "Chemical Control Order (CCO) Importation Clearance (CHEM)",
  "Chemical Control Order (CCO) for Arsenic (Importation Clearance)",
  "Chemical Control Order (CCO) for Sodium Cyanide (Clearance for Importation)",
  "Chemical Control Order (CCO) for Cadmium and Cadmium Compounds (Importation Certificate)",
  "Chemical Control Order (CCO) for Chromium VI Compounds (Importation Clearance)",
  "Chemical Control Order (CCO) for Lead Importation Clearance",
  "Issuance of Registration Certificate for Treatment, Storage and Disposal (TSD) Facility",
  "Issuance of Registration Certificate for HW Transporter",
  "Importer of Recyclable Materials Containing Hazardous Substances Registration",
  "Application for Importation Clearance for Recyclable Materials Containing Hazardous Substances",
  "Application for Transmittal of Notification",
  "Application for Export Clearance",
  "Analysis of Environmental Samples",
  "Environmental Laboratory Recognition (ELR)",
  "Certificate of Registration (COR) for Ozone Depleting Substances and its Alternative (per substance)",
  "Pre-Shipment Importation Clearance (PSIC) for Ozone Depleting Substances and its Alternative (per substance/importation)",
  "Facilitation, Evaluation, Updating and Approval of Ten-Year Solid Waste Management Plan",
  "Environmental Compliance Certificate (ECC) - Category A (ECP)",
  "Environmental Compliance Certificate (ECC) Category B IEE Checklist (Online)",
  "Certificate of Non-Coverage (Category C / Prior 1982)",
  "Certificate of Non-Coverage (Category D)",
  "Application for Recognition as Training Organization / Institution for PCO",
  "Application for Recognition as Training Organization / Institution for PCO Renewal",
  "Handling of request for IEC materials/Lectures and Production of Information, Education and Communication (IEC) Material",
  "Action on Pollution Complaint (NBR)",
  "Application for Philippine Inventory of Chemicals Substance (PICCS)",
  "Application for Chemical Control Order (CCO) - Polychlorinated Biphenyl (PCB) - Online Application",
  "Chemical Control Order (CCO) Registration for Mercury, Cyanide, Asbestos, ODS & PCBs",
  "Hazardous Waste Generator Registration (HAZ)",
  "Hazardous Waste Transport Manifest Form 18 11698 Laboratory Process",
  "Notice to Proceed for Dismantling of Asbestos-Containing Materials",
  "Permit to Operate (PTO) Air Pollution Source Installation/ Equipment (APSI/E) and Corresponding Air Pollution Control Device (New)",
  "Permit to Operate (PTO) Air Pollution Sources Installation/ Equipment (APSI/E) and Corresponding Air Pollution Control Device (Renewal)",
  "Permit to Transport (PTT)",
  "Document Authentication",
  "Pollution Control Officer (PCO) Accreditation (New)",
  "Pollution Control Officer (PCO) Accreditation (Renewal)",
  "Request for Information",
  "Official record/ Documents",
  "Small Quantity Importation (SQI) Clearance",
  "Submission of Self-Monitoring Reports and Compliance",
  "Wastewater Discharge Permit (New)",
  "Wastewater Discharge Permit (Renewal)",
];

async function seed() {
  const mongoUri =
    process.env.MONGO_URI || process.env.MONGODB_URI || "mongodb://localhost:27017/emb-satisfactory";

  console.log("Connecting to MongoDB...");
  await mongoose.connect(mongoUri);
  console.log("Connected.");

  let created = 0;
  let skipped = 0;

  const upsert = async (name, type) => {
    const existing = await ServiceCategory.findOne({ name });
    if (existing) {
      skipped++;
      return;
    }
    await ServiceCategory.create({ name, type });
    created++;
  };

  for (const name of INTERNAL_SERVICES) {
    await upsert(name, "internal");
  }
  for (const name of EXTERNAL_SERVICES) {
    await upsert(name, "external");
  }

  console.log(`Done. Created: ${created}, Skipped (already exists): ${skipped}`);

  // Also sync Q5 "Service Availed" question options with all services
  const allServices = [...INTERNAL_SERVICES, ...EXTERNAL_SERVICES];
  const q5 = await Question.findOne({ questionCode: "Q5" });
  if (q5) {
    const existing = new Set((q5.options || []).map((s) => s.trim().toLowerCase()));
    let added = 0;
    for (const svc of allServices) {
      if (!existing.has(svc.trim().toLowerCase())) {
        q5.options.push(svc);
        added++;
      }
    }
    if (added > 0) {
      q5.updatedAt = new Date();
      await q5.save();
      console.log(`Updated Q5 options: added ${added} new services.`);
    } else {
      console.log("Q5 options already contain all services.");
    }
  } else {
    // Create Q5 if it doesn't exist
    await Question.create({
      questionCode: "Q5",
      questionText: "Service Availed:",
      questionType: "dropdown",
      options: allServices,
      user: "system",
    });
    console.log("Created Q5 question with all services.");
  }

  await mongoose.disconnect();
}

seed().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
