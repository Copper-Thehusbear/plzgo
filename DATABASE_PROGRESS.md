# Plzgo Database Progress (Last Update: 2026-04-24)

## 🟢 Status: SEED READY (Text-Only)
ฐานข้อมูลในไฟล์ `Plzgo_MasterDB_Clean.csv` ถูก Enrichment จนครบถ้วนในเชิงเนื้อหาและ DNA แล้ว พร้อมสำหรับการ Seed เข้า Firestore เพื่อทดสอบระบบ

### 📊 Field Completeness Audit
| Category | Field | Status | Notes |
| :--- | :--- | :--- | :--- |
| **Core** | plzgo_id, name, lat/lng | ✅ 100% | ตรวจสอบความถูกต้องทางภูมิศาสตร์แล้ว |
| **Identity** | category, vibe_primary, tags | ✅ 100% | Derived vibes จากหมวดหมู่และชื่อร้าน |
| **DNA** | insight_en, insight_th | ✅ 100% | แก้ไข 84 bland records ให้มี DNA (อารมณ์ขัน/Tips) แล้ว |
| **Timing** | opening_hours_en, duration | ✅ 100% | ใส่ค่า Default ตามหมวดหมู่ (Food 10-22, Bar 19-02) |
| **Transit** | nearest_transit, transit_note | ✅ 100% | เพิ่ม Grab/Bolt Tips และเขียนใหม่ตามสไตล์ plzgo |
| **Search** | search_tags_en, gay_score | ✅ 100% | พร้อมสำหรับระบบ Filter และ Search |
| **Imagery** | image_source_url | 🔴 0% | **BLOCKER:** ยังไม่มีรูปภาพ (รอ n8n / Places API) |
| **Enrich** | google_place_id, address | 🔴 0% | รอการเชื่อมต่อ Google Places API |

---

## 🛠️ Next Steps (What to do next)

1. **Placeholder Images (Recommended):**
   - หากต้องการ Seed เพื่อดูความสวยงามของแอปก่อน ให้รันสคริปต์ฉีด Unsplash URL ตามหมวดหมู่เข้า `image_source_url`
2. **Actual Seeding:**
   - รันสคริปต์ `seed-firestore.cjs` (ตรวจสอบความพร้อมของ Firebase Admin SDK ก่อน)
3. **Data Enrichment (Phase 2):**
   - ใช้ `enrich-places.js` เพื่อดึง `google_place_id` และ `address` จริง
   - รัน n8n workflow เพื่อดึงรูปภาพจริงมาแทนที่ Placeholder
4. **Logic Check:**
   - ตรวจสอบ `match_time_of_day` และ `match_companion` อีกครั้งหลัง Seed เพื่อให้ระบบ Recommendation ทำงานแม่นยำ

---

## 📝 Recent Worklog Summary
- **2026-04-24:**
  - เพิ่ม `nearest_transit` ให้กับ 87 records ที่ขาดหายไปตามโซน (เช่น Samyan, Samut Prakan)
  - เขียน `transit_note_en/th` ใหม่ทั้งหมด 730 records ให้มี DNA และเพิ่มคำแนะนำการใช้ Grab/Bolt
  - Rewrite `insight_en/th` สำหรับ 82 รายการที่ "แห้ง" (Bland) ให้มีความเป็นเพื่อนและสนุกขึ้นตามคอนเซปต์ Copper
