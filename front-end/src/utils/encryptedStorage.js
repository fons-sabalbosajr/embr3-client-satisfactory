// src/utils/encryptedStorage.js
import CryptoJS from 'crypto-js';

const secretKey = import.meta.env.VITE_COLOR_SCHEME_SECRET;

export function setEncryptedItem(key, value) {
  const encrypted = CryptoJS.AES.encrypt(value, secretKey).toString();
  localStorage.setItem(key, encrypted);
}

export function getDecryptedItem(key) {
  const encrypted = localStorage.getItem(key);
  if (!encrypted) return null;

  try {
    const bytes = CryptoJS.AES.decrypt(encrypted, secretKey);
    return bytes.toString(CryptoJS.enc.Utf8);
  } catch {
    return null;
  }
}
