// src/services/authService.js
import CryptoJS from "crypto-js";
import { getCachedConfig } from "../utils/config";
import { getOpaqueItem } from "../utils/encryptedStorage";

export const getCurrentUserFullname = () => {
  const { colorSchemeSecret = "" } = getCachedConfig();
  const encryptedUser = getOpaqueItem("user");
  if (encryptedUser) {
    try {
      const bytes = CryptoJS.AES.decrypt(encryptedUser, colorSchemeSecret);
      const decryptedDataString = bytes.toString(CryptoJS.enc.Utf8);
      if (!decryptedDataString) {
        throw new Error("Decryption resulted in empty string.");
      }
      const decryptedData = JSON.parse(decryptedDataString);
      return decryptedData.fullname || "Unknown User";
    } catch (e) {
      console.error("Decryption failed:", e);
      return "Unknown User";
    }
  }
  return "Guest";
};
