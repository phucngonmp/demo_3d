import fs from 'fs';
import path from 'path';

// Rất đơn giản, đọc file dạng buffer và tìm các chuỗi string giống tên material
const filePath = process.argv[2];
const buffer = fs.readFileSync(filePath);
const content = buffer.toString('utf-8');

// GLB chứa mảng vật liệu dưới dạng JSON (ở phần chunk 0)
// Ta sẽ regex tìm mảng "materials": [{"name":"..."}, ...]
const match = content.match(/"materials"\s*:\s*\[(.*?)\]\s*[,}]/s);
if (match) {
  try {
    const materialsJson = `[${match[1]}]`;
    const materials = JSON.parse(materialsJson);
    console.log("=== DANH SÁCH MATERIAL ===");
    materials.forEach((m: any, i: number) => {
      console.log(`${i + 1}. ${m.name}`);
    });
  } catch (e) {
    console.log("Found materials block but failed to parse JSON exactly. Extracting raw names...");
    const nameMatches = match[1].match(/"name"\s*:\s*"([^"]+)"/g);
    if (nameMatches) {
        console.log("=== DANH SÁCH MATERIAL ===");
        nameMatches.forEach((nm, i) => console.log(`${i+1}. ${nm.replace(/"name"\s*:\s*"/, '').replace('"', '')}`));
    }
  }
} else {
  console.log("Không tìm thấy materials block");
}
