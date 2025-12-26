// Simple E2EE service using Web Crypto API (ECDH + AES-GCM)

// Helper to convert ArrayBuffer to Base64
const arrayBufferToBase64 = (buffer: ArrayBuffer): string => {
  let binary = '';
  const bytes = new Uint8Array(buffer);
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return window.btoa(binary);
};

// Helper to convert Base64 to ArrayBuffer
const base64ToArrayBuffer = (base64: string): ArrayBuffer => {
  const binary_string = window.atob(base64);
  const len = binary_string.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binary_string.charCodeAt(i);
  }
  return bytes.buffer;
};

export const generateKeyPair = async (): Promise<{ publicKey: string; privateKey: CryptoKey }> => {
  const keyPair = await window.crypto.subtle.generateKey(
    {
      name: "ECDH",
      namedCurve: "P-256",
    },
    true,
    ["deriveKey"]
  );

  const exportedPublicKey = await window.crypto.subtle.exportKey("spki", keyPair.publicKey);
  return {
    publicKey: arrayBufferToBase64(exportedPublicKey),
    privateKey: keyPair.privateKey
  };
};

export const importPublicKey = async (pem: string): Promise<CryptoKey> => {
  return await window.crypto.subtle.importKey(
    "spki",
    base64ToArrayBuffer(pem),
    {
      name: "ECDH",
      namedCurve: "P-256",
    },
    false,
    []
  );
};

export const deriveSharedKey = async (privateKey: CryptoKey, publicKey: CryptoKey): Promise<CryptoKey> => {
  return await window.crypto.subtle.deriveKey(
    {
      name: "ECDH",
      public: publicKey,
    },
    privateKey,
    {
      name: "AES-GCM",
      length: 256,
    },
    false,
    ["encrypt", "decrypt"]
  );
};

export const encryptMessage = async (text: string, sharedKey: CryptoKey): Promise<string> => {
  const encoded = new TextEncoder().encode(text);
  const iv = window.crypto.getRandomValues(new Uint8Array(12));
  const encrypted = await window.crypto.subtle.encrypt(
    {
      name: "AES-GCM",
      iv: iv,
    },
    sharedKey,
    encoded
  );

  const ivHex = arrayBufferToBase64(iv.buffer);
  const encryptedHex = arrayBufferToBase64(encrypted);
  return `ENC:${ivHex}:${encryptedHex}`;
};

export const decryptMessage = async (cipherText: string, sharedKey: CryptoKey): Promise<string> => {
  if (!cipherText.startsWith('ENC:')) return cipherText;

  try {
    const parts = cipherText.split(':');
    const iv = base64ToArrayBuffer(parts[1]);
    const data = base64ToArrayBuffer(parts[2]);

    const decrypted = await window.crypto.subtle.decrypt(
      {
        name: "AES-GCM",
        iv: new Uint8Array(iv),
      },
      sharedKey,
      data
    );

    return new TextDecoder().decode(decrypted);
  } catch (e) {
    console.error("Decryption failed", e);
    return "🔒 Decryption Error";
  }
};

// Local Storage Helpers for Private Key (Simple approach for this app)
export const storePrivateKey = async (key: CryptoKey) => {
  const exported = await window.crypto.subtle.exportKey("pkcs8", key);
  localStorage.setItem('ichat_private_key', arrayBufferToBase64(exported));
};

export const getPrivateKey = async (): Promise<CryptoKey | null> => {
  const stored = localStorage.getItem('ichat_private_key');
  if (!stored) return null;
  
  try {
    return await window.crypto.subtle.importKey(
      "pkcs8",
      base64ToArrayBuffer(stored),
      {
        name: "ECDH",
        namedCurve: "P-256",
      },
      false,
      ["deriveKey"]
    );
  } catch (e) {
    console.error("Failed to load private key", e);
    return null;
  }
};