export function generateInviteCode() {
  // Use crypto.getRandomValues for cryptographically secure invite codes
  const arr = new Uint8Array(12);
  crypto.getRandomValues(arr);
  return Array.from(arr, b => b.toString(36).padStart(2, '0')).join('').slice(0, 16);
}

export function getInviteUrl(code) {
  return `${window.location.origin}/join/${code}`;
}