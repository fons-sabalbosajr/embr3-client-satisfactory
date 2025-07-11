// src/services/authService.js
import CryptoJS from "crypto-js";

const secretKey = import.meta.env.VITE_SECRET_KEY;

export const getCurrentUserFullname = () => {
  const encryptedUser = localStorage.getItem("user");
  if (encryptedUser) {
    try {
      const bytes = CryptoJS.AES.decrypt(encryptedUser, secretKey);
      const decryptedDataString = bytes.toString(CryptoJS.enc.Utf8);
      if (!decryptedDataString) {
        throw new Error("Decryption resulted in empty string.");
      }
      const decryptedData = JSON.parse(decryptedDataString);
      return decryptedData.fullname || "Unknown User";
    } catch (e) {
      console.error("Decryption failed:", e);
      // It's good practice to clear corrupted data, though typically done on logout/login failure
      // localStorage.removeItem("user");
      // localStorage.removeItem("token");
      return "Unknown User";
    }
  }
  return "Guest"; // Or null, depending on your desired default
};
