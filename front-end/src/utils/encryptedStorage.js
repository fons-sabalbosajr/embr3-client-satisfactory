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

// --- Session storage counterparts ---

export function setEncryptedSessionItem(key, value) {
  const { colorSchemeSecret = '' } = getCachedConfig();
  const encrypted = CryptoJS.AES.encrypt(value, colorSchemeSecret).toString();
  try {
    sessionStorage.setItem(deriveStorageKey(key), encrypted);
  } catch {
    // best-effort
  }
}

export function getDecryptedSessionItem(key) {
  const { colorSchemeSecret = '' } = getCachedConfig();
  const encrypted = sessionStorage.getItem(deriveStorageKey(key));
  if (!encrypted) return null;
  try {
    const bytes = CryptoJS.AES.decrypt(encrypted, colorSchemeSecret);
    return bytes.toString(CryptoJS.enc.Utf8);
  } catch {
    return null;
  }
}

// --- Migration & cleanup ---

// List of known sensitive keys that should be encrypted
const SENSITIVE_KEYS = ['token', 'user', 'darkMode', 'mantine-color-scheme', 'themePrefsCache'];

/**
 * Migrate any remaining plain-text sensitive keys to encrypted storage.
 * Safe to call multiple times (idempotent).
 */
export function migratePlainKeysToEncrypted() {
  SENSITIVE_KEYS.forEach((logicalKey) => {
    try {
      const plainValue = localStorage.getItem(logicalKey);
      if (plainValue && !getOpaqueItem(logicalKey)) {
        // For 'token' use opaque (not AES), for everything else use AES encryption
        if (logicalKey === 'token') {
          setOpaqueItem(logicalKey, plainValue);
        } else {
          setEncryptedItem(logicalKey, plainValue);
        }
        localStorage.removeItem(logicalKey);
      }
    } catch {
      // ignore individual key failures
    }
  });
}

/**
 * Wipe all storage (both localStorage and sessionStorage).
 * Useful for logout to ensure no residual data.
 */
export function clearAllStorage() {
  try {
    localStorage.clear();
    sessionStorage.clear();
  } catch {
    // best-effort
  }
}
