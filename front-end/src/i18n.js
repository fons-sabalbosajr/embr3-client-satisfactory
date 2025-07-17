// src/i18n.js
import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import LanguageDetector from "i18next-browser-languagedetector";

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    fallbackLng: "en",
    interpolation: { escapeValue: false },
    resources: {
      en: {
        translation: {
          // Home.jsx
          agencyTitle: "Republic of the Philippines",
          department: "DEPARTMENT OF ENVIRONMENT AND NATURAL RESOURCES",
          bureau: "ENVIRONMENTAL MANAGEMENT BUREAU III",
          address1: "Masinop Corner, Matalino St., Diosdado Macapagal Government Center",
          address2: "Maimpis, City of San Fernando, Pampanga",
          csmTitle: "Online Client Satisfaction Measurement",
          feedbackText: "We want your feedback!",
          takeSurvey: "Take the Survey",
          selectLanguage: "Select Language",
          toggleColor: "Toggle color scheme",

          // Survey.jsx
          personalInfo: "Personal Information",
          submitSurvey: "Submit Survey",
          cancel: "Cancel",
          next: "Next",
          back: "Back",
          thankYou: "Thank you for your feedback!",
        },
      },
      fil: {
        translation: {
          // Home.jsx
          agencyTitle: "Republic of the Philippines",
          department: "DEPARTMENT OF ENVIRONMENT AND NATURAL RESOURCES",
          bureau: "ENVIRONMENTAL MANAGEMENT BUREAU III",
          address1: "Masinop Corner, Matalino St., Diosdado Macapagal Government Center",
          address2: "Maimpis, City of San Fernando, Pampanga",
          csmTitle: "Online Client Satisfaction Measurement",
          feedbackText: "Kailangan namin ang iyong puna!",
          takeSurvey: "Sagutan ang Survey",
          selectLanguage: "Piliin ang Wika",
          toggleColor: "I-toggle ang tema",

          // Survey.jsx
          personalInfo: "Impormasyon ng Kliyente",
          submitSurvey: "Ipasa ang Survey",
          cancel: "Kanselahin",
          next: "Susunod",
          back: "Bumalik",
          thankYou: "Maraming salamat sa iyong puna!",
        },
      },
    },
  });

export default i18n;
