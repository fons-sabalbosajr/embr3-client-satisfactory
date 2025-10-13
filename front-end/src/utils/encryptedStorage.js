// src/utils/encryptedStorage.js
import CryptoJS from 'crypto-js';
import { getCachedConfig } from './config';

// Derive an opaque storage key from a logical key using a secret.
// Note: This is obfuscation only; secrets in the browser are not secure.
function deriveStorageKey(logicalKey) {
  const { secretKey = '', colorSchemeSecret = '' } = getCachedConfig();
  const salt = secretKey || colorSchemeSecret || 'fallback';
  const hash = CryptoJS.SHA256(`${logicalKey}::${salt}`).toString(
    CryptoJS.enc.Hex
  );
  // Shorten and prefix to look generic
  return `__k_${hash.slice(0, 24)}`;
}

export function setOpaqueItem(logicalKey, value) {
  const key = deriveStorageKey(logicalKey);
  localStorage.setItem(key, value);
}

export function getOpaqueItem(logicalKey) {
  const key = deriveStorageKey(logicalKey);
  return localStorage.getItem(key);
}

export function removeOpaqueItem(logicalKey) {
  const key = deriveStorageKey(logicalKey);
  localStorage.removeItem(key);
}

export function setEncryptedItem(key, value) {
  const { colorSchemeSecret = '' } = getCachedConfig();
  const encrypted = CryptoJS.AES.encrypt(value, colorSchemeSecret).toString();
  // Store under obfuscated key; also remove old plain key if present
  try {
    setOpaqueItem(key, encrypted);
    localStorage.removeItem(key);
  } catch {
    // best-effort; ignore
  }
}

export function getDecryptedItem(key) {
  const { colorSchemeSecret = '' } = getCachedConfig();
  // Prefer obfuscated key, fallback to plain (for backward-compat)
  const encrypted = getOpaqueItem(key) ?? localStorage.getItem(key);
  if (!encrypted) return null;

  try {
    const bytes = CryptoJS.AES.decrypt(encrypted, colorSchemeSecret);
    return bytes.toString(CryptoJS.enc.Utf8);
  } catch {
    return null;
  }
}
