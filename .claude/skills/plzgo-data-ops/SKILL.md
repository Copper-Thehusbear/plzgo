---
name: plzgo-data-ops
description: จัดการวงจรข้อมูลสถานที่ของ plzgo — แก้ที่ Firestore ตรงๆ → enrich → export CSV backup → verify ใช้เมื่อเพิ่ม/แก้ place, ตรวจคุณภาพ field, หรือเติมรูปภาพ (image enrichment) Trigger: "เพิ่มสถานที่", "seed", "ตรวจ DB", "รูปยังไม่ครบ", "enrich"
---

# plzgo Data Ops

## แหล่งความจริงเดียว (Single Source of Truth)
- **Firestore `places` (483 docs) คือของจริง** — CSV ต้นฉบับตัวเดิมหายไปแล้ว ตอนนี้ `plzgo-db-task/Plzgo_MasterDB_Clean.csv` เป็นแค่ export snapshot ที่ regenerate มาจาก Firestore
- แก้ข้อมูลที่ Firestore ตรงๆ ผ่าน script เฉพาะทาง (เช่น `scripts/apply-insight-rewrites.js`, `scripts/enrich-places.js`) แล้ว **regenerate CSV ทีหลัง** ด้วย `node scripts/export-master-csv.js` — ห้ามทำย้อนทาง (แก้ CSV แล้วหวังว่าจะ sync เข้า Firestore เอง)
- สถานะปัจจุบัน (2026-07-12): text fields ครบ 100% (insight, transit_note 483/483) / imagery enrich ครบแต่ URL ตอบ 403 เพราะ billing ปิดอยู่ — ดูรายละเอียดใน `CLAUDE.md`

## Field Standards (ต้องครบก่อนเขียนเข้า Firestore)
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
1. แก้/เพิ่ม doc ใน Firestore `places` ตรงๆ ผ่าน script เฉพาะทาง (ห้ามแก้ผ่าน Console มือเปล่าสำหรับ bulk edit — ไม่มี audit trail)
2. รันชุดตรวจหลังแก้:
   - `node scripts/check-place-zones.js` — zone ตรงกับ centroid map
   - `node scripts/check-empty-zones.js`
   - `node scripts/check-lang.js` — TH/EN ครบคู่
   - `node scripts/check-photo-urls.js` — URL รูปไม่ตาย
3. Verify: `node scripts/verify-migration.js` + `node scripts/list-db.js` เทียบจำนวน docs
4. Export CSV backup ให้ตรงของจริง: `node scripts/export-master-csv.js`
5. เปิดเว็บจริงเช็ค SwipeView ว่า card pool ขึ้นครบทุก vibe

## Image Enrichment
รูปจริงถ่ายจากแหล่งทางการครบทุกที่แล้ว (2.24 GB ใน `gs://plzgo-bf50c.firebasestorage.app/places/…`) — **ห้ามใช้ Unsplash หรือ stock photo อื่นแทนรูปสถานที่จริงเด็ดขาด** (ดู feedback memory เรื่องนี้)
- ตอนนี้ทุก URL ตอบ 403 เพราะ billing account ของโปรเจกต์ปิดอยู่ — ไม่ใช่ปัญหาเรื่องข้อมูล แก้ได้ด้วยการผูก billing account ใหม่เท่านั้น
- ถ้าต้องเติม `google_place_id`/address ของสถานที่ใหม่ ใช้ `scripts/enrich-places.js`
- งาน batch ที่มี rate limit/cost ให้ทำแบบ resume-safe มี checkpoint file (ดู pattern ใน `fill-transit-batch.cjs`) แต่ห้าม commit checkpoint/preview/error json ที่เป็น run output เข้า git

## ห้ามทำ
- ห้ามเขียนเข้า Firestore โดยไม่รัน check scripts ก่อน
- ห้ามสร้าง vibe tag ใหม่โดยไม่เช็คว่ามี tag ความหมายเดียวกันอยู่แล้ว
- ห้ามลบ field ออกจาก schema โดยไม่เช็ค `useFirestore.js` ว่า query ใช้อยู่หรือไม่
