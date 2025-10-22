// src/services/authService.js
import { getDecryptedItem } from "../utils/encryptedStorage";

export const getCurrentUserFullname = () => {
  const decryptedDataString = getDecryptedItem("user");
  if (!decryptedDataString) return "Guest";
  try {
    const decryptedData = JSON.parse(decryptedDataString);
    return decryptedData.fullname || "Unknown User";
  } catch {
    return "Unknown User";
  }
};
