/**
 * Tính toán mã băm SHA-256 từ nội dung của một File
 * Trả về chuỗi Hexadecimal.
 */
export async function calculateFileHash(file: File): Promise<string> {
  const buffer = await file.arrayBuffer();
  // Sử dụng Web Crypto API (Nhanh và được tích hợp sẵn ở mọi trình duyệt hiện đại)
  const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
  
  // Chuyển Hash ArrayBuffer thành chuỗi Hex (Ví dụ: "e3b0c44298fc...")
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  
  return hashHex;
}
