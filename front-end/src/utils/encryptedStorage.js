// src/utils/encryptedStorage.js
import CryptoJS from 'crypto-js';
import { getConfig } from './config';

export async function setEncryptedItem(key, value) {
  const { colorSchemeSecret = '' } = await getConfig();
  const encrypted = CryptoJS.AES.encrypt(value, colorSchemeSecret).toString();
  localStorage.setItem(key, encrypted);
}

export async function getDecryptedItem(key) {
  const { colorSchemeSecret = '' } = await getConfig();
  const encrypted = localStorage.getItem(key);
  if (!encrypted) return null;

  try {
    const bytes = CryptoJS.AES.decrypt(encrypted, colorSchemeSecret);
    return bytes.toString(CryptoJS.enc.Utf8);
  } catch {
    return null;
  }
}
