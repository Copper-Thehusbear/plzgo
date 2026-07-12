---
name: plzgo-data-ops
description: จัดการวงจรข้อมูลสถานที่ของ plzgo — Master CSV → enrich → seed Firestore → verify ใช้เมื่อเพิ่ม/แก้ place, seed ข้อมูล, ตรวจคุณภาพ field, หรือเติมรูปภาพ (image enrichment) Trigger: "เพิ่มสถานที่", "seed", "ตรวจ DB", "รูปยังไม่ครบ", "enrich"
---

# plzgo Data Ops

## แหล่งความจริงเดียว (Single Source of Truth)
- **Master file:** `plzgo-db-task/Plzgo_MasterDB_Clean.csv` (~730 แถว)
- Firestore `places` เป็นปลายทาง ห้ามแก้ข้อมูลใน Firestore ตรงๆ แล้วไม่อัปเดต CSV — ทุกการแก้เริ่มที่ CSV แล้ว seed ใหม่
- สถานะปัจจุบัน: text fields ครบ 100% / `image_source_url` = 0% (BLOCKER) / `google_place_id`, `address` = 0%

## Field Standards (ต้องครบก่อน seed)
| Field | กติกา |
|---|---|
| `plzgo_id`, `name`, `name_en`, lat/lng | บังคับ, ตรวจพิกัดว่าอยู่ในกรุงเทพจริง |
| `type` | attraction / food / nightlife / market / hotel / shopping / area เท่านั้น |
| `vibe_tags` | array, ต้องมีอย่างน้อย 1 tag; ใช้ `scripts/get-all-vibes.js` ดู tag ที่มีอยู่ก่อนสร้างใหม่ |
| `time_tag` | Morning / Afternoon / Evening / Night / Anytime |
| `insight_en`, `insight_th` | ต้องมี "DNA" — ห้าม bland (ดู skill plzgo-voice) |
| `opening_hours` | ถ้าไม่มีข้อมูลจริง ใช้ default ตามหมวด: Food 10–22, Bar 19–02 |
| `transit.nearest_transit`, `transit_note` | ทุกแถว + tip Grab/Bolt ถ้าไกลรถไฟฟ้า |
| `zone` | ต้อง map เข้า 8 Bangkok hubs ใน `useZoneCentroid.js` — zone แปลกทำ BaseCampCard พัง |

## Workflow มาตรฐาน
1. แก้/เพิ่มแถวใน Master CSV
2. รันชุดตรวจก่อน seed:
   - `node scripts/check-place-zones.js` — zone ตรงกับ centroid map
   - `node scripts/check-empty-zones.js`
   - `node scripts/check-lang.js` — TH/EN ครบคู่
   - `node scripts/check-photo-urls.js` — URL รูปไม่ตาย
3. Seed: `node scripts/seed-master-700.js` (ตัวปัจจุบัน — `seed-firestore.cjs` / `seed-bangkok.cjs` เป็น legacy ห้ามใช้)
4. Verify: `node scripts/verify-migration.js` + `node scripts/list-db.js` เทียบจำนวน docs กับจำนวนแถว CSV
5. เปิดเว็บจริงเช็ค SwipeView ว่า card pool ขึ้นครบทุก vibe

## Image Enrichment (งานค้างอันดับ 1)
ลำดับที่วางไว้:
1. **Placeholder ก่อน** — ฉีด Unsplash URL ตามหมวดเข้า `image_source_url` เพื่อให้แอปดูสมบูรณ์ระหว่างรอของจริง
2. **ของจริง** — `scripts/enrich-places.js` ดึง `google_place_id` + address → n8n workflow ดึงรูปจาก Places API
3. ระวังโควตา/ค่าใช้จ่าย Places API — รันเป็น batch มี checkpoint (ดู pattern ใน `fill-transit-batch.cjs` + `transit-checkpoint.json`)

## ห้ามทำ
- ห้าม seed โดยไม่รัน check scripts ก่อน
- ห้ามสร้าง vibe tag ใหม่โดยไม่เช็คว่ามี tag ความหมายเดียวกันอยู่แล้ว
- ห้ามลบ field ออกจาก schema โดยไม่เช็ค `useFirestore.js` ว่า query ใช้อยู่หรือไม่
