---
name: plzgo-design
description: ระบบออกแบบ "Transit Diagram" ของ plzgo — ทิศทางภาพที่ตัดสินใจแล้ว (2026-07) ใช้ทุกครั้งที่แตะไฟล์ .vue/.css, สร้าง component, หรือ review UI Trigger: "redesign", "UI", "หน้าตา", "CSS", "component ใหม่", "ดูเป็น AI"
---

# plzgo Design System — Transit Diagram

## Concept (ทำไมทิศทางนี้)
plzgo คือเครื่อง routing — ภาษาภาพจึงเป็นภาษาของ**แผนผังเส้นทางขนส่ง**: เส้นสีต่อเนื่อง จุดสถานี ป้ายบอกทาง ตัวเลขกำกับ
กติกาแม่: **โครงสร้างภาพต้องเข้ารหัสข้อมูลจริงเสมอ** — เลขสถานีคือลำดับจริง สีเส้นคือวันจริง จุดคือสถานที่จริง ห้ามใช้ element เชิงตกแต่งที่ไม่ encode อะไร

## Tokens (แทนที่ของเดิมทั้งหมดใน style.css)
```css
:root {
  --paper:   #F6F5F1;  /* พื้นหลังทุกหน้า (กระดาษแผนที่) */
  --ink:     #1C273D;  /* ตัวอักษร โครงสร้าง แถบ header */
  --line-1:  #FF8C42;  /* Day 1 + CTA หลัก (ส้มแบรนด์เดิม) */
  --line-2:  #12796F;  /* Day 2 */
  --line-3:  #C2497D;  /* Day 3 */
  --signal:  #FFD235;  /* Unmarked stop / golden pins (เดิม) */
  --hairline:#DEDACF;  /* เส้นแบ่ง ขอบการ์ด */
  --muted:   #6B7280;  /* ข้อความรอง */

  /* Soft shadow — เพิ่มเข้ามา 2026-08 (เดิม "ไม่มีเงา") */
  --shadow-sm:   0 2px 8px rgba(28,39,61,.07);   /* พักตัวปกติ ทุก .glass-panel */
  --shadow-md:   0 10px 28px rgba(28,39,61,.12); /* hover lift การ์ดที่กดได้ */
  --shadow-lift: 0 18px 40px rgba(28,39,61,.16); /* lift แรงกว่า — SwipeCard, CTA เด่น */
}
```
- เงา: **ใช้ได้แล้ว** ผ่าน token `--shadow-sm/md/lift` เท่านั้น (2026-08 amendment) — เป็นเงา neutral โทน ink ห้าม glow สี ห้ามใช้ `box-shadow` ค่าอื่นนอก token
- radius: การ์ด 6–8px / pill รหัสสถานีและ line badge เท่านั้นที่ 999px
- SwipeView คงพื้นเข้ม (--ink) ได้ — เล่าเป็น "โหมดอุโมงค์" แต่ต้องไม่มี glass

## Typography — ตระกูล IBM Plex เดียวทั้งระบบ
| บทบาท | Font | ใช้กับ |
|---|---|---|
| Body TH/EN | IBM Plex Sans Thai (มีอยู่แล้ว) | ข้อความทั่วไป, insight |
| Display EN | IBM Plex Sans Condensed 700 | Headline ใหญ่, ชื่อหน้า (TH fallback → Plex Sans Thai 700) |
| Data | IBM Plex Mono 500 | **ตัวเลขที่เป็นข้อมูลทุกตัว**: เวลา, รหัส S1/S2, ระยะทาง, นาทีเดิน, ราคา |
กติกาเหล็ก: เห็นตัวเลขข้อมูล = Mono เสมอ นี่คือกลิ่น "ตารางเวลา" ของทั้งระบบ
ห้าม: Fraunces และ serif ทุกตัว / gradient text / eyebrow ตัวพิมพ์ใหญ่ letter-spacing ยืด (caps ใช้ได้เฉพาะ label mono สั้นๆ แบบป้าย เช่น "LAST STOP")

## ภาษา Component (translation map)
| ของเดิม | กลายเป็น | หมายเหตุ |
|---|---|---|
| TimelineItem | **StationRow** — จุดบนเส้น + เวลา mono + ชื่อ + insight + transfer badge | transfer badge ดึงจาก `transit.bts/mrt/boat` ที่ enrich ไว้แล้ว — ข้อมูลนี้ต้องขึ้นจอ |
| Day tabs | **Line badges** — "● Line 1 · Sat" สีตามวัน | สี marker บนแผนที่ต้องตรงกับสีเส้นวันเดียวกัน 100% |
| ContextPinCard | **Unmarked stop** — การ์ดขอบ dashed สี signal บนเส้น | copy: "add to line?" |
| BaseCampCard | **Base camp · Interchange** — สัญลักษณ์วงแหวนคู่ | โรงแรม = จุดเชื่อมต่อของทุกเส้น |
| SwipeCard | **ตั๋ว/ป้ายสถานี** — ขอบคม ข้อมูลจัดแบบตั๋ว | ปุ่ม: "Board" (ขวา) / "Skip stop" (ซ้าย) |
| Tab bar แคปซูลลอย | **แถบป้ายเต็มความกว้าง** ติดล่าง hairline ด้านบน | ห้ามลอย ห้ามเบลอ |
| Font Awesome ทั่วจอ | icon เฉพาะที่ป้ายจริงมี: ยานพาหนะ (train/ship/walk), ทิศทาง, ประเภทสถานที่ | ที่เหลือใช้ตัวอักษร/ตัวเลขแทน |

## Hard Bans (สิ่งที่ทำให้โดนด่าว่า AI slop — ห้ามกลับมา)
1. `backdrop-filter` ทุกรูปแบบ (glassmorphism) — **ยกเว้น `.glass-nav` เดียว** (2026-08 amendment ที่ 2): `blur(14px)` บนพื้น paper โปร่งแสง 82% ห้ามเพิ่ม blur ที่จุดอื่นโดยไม่คุยก่อน — `SwipeView.vue` มี override ของตัวเองเป็นพื้น ink ทึบไม่มี blur (โหมดอุโมงค์) ห้ามลบ
2. mesh/aurora gradient background, blob เบลอลอย (`liquid-bg`, `liquid-blob` — ลบทิ้ง)
3. hover แล้ว **scale** + เงา**เรืองสี** (glow สีส้ม/สีอื่น) — ยังห้าม; hover-lift ที่อนุญาต (2026-08) คือ `translateY(-2px ถึง -4px)` + `--shadow-md`/`--shadow-lift` เท่านั้น เงาต้องเป็นโทน ink neutral ไม่ใช่สีเรือง และใช้เฉพาะกับ element ที่กดได้จริง (ห้าม hover-lift การ์ดที่ไม่คลิกได้ — ทำให้เข้าใจผิดว่ากดได้)
4. การ์ดโปร่งแสงขอบขาว radius 24–32px
5. gradient บนตัวอักษร / emoji ใน UI chrome
6. section ที่มี icon + หัวข้อ + คำอธิบาย 3 คอลัมน์แบบ template landing
ทุกครั้งก่อน commit งาน UI: ถามว่า "ถ้า generate หน้าแบบเดียวกันให้แอปอื่น จะได้หน้าตาเดิมไหม" — ถ้าใช่ = ยังไม่ใช่ plzgo

## Motion — ทุ่มที่เดียว (+ ข้อยกเว้น LandingView, 2026-08)
- **Signature เดียว**: เส้น route วาดตัวเองตอน ResultView โหลด (SVG `stroke-dashoffset` ~700ms, ease-out) + จุดสถานีทยอยติดตามเส้น — StationRow แต่ละแถวตอนนี้ stagger เข้ามาพร้อมกัน (`animation-delay` ผูกกับ index ของ stop) เป็นส่วนขยายของ signature เดิม ไม่ใช่กฎใหม่
- ที่เหลือใน SwipeView/ResultView/HomeView/RouteView: เปลี่ยนสถานะทันที ไม่มี float ลอยเปล่าๆ ไม่มี pulse ยกเว้น golden pin เดิม — **ยกเว้น hover-lift ที่อนุญาตใหม่** (ดู Hard Bans #3) บน element ที่กดได้จริง, และ **idle sway** บน `.sw-card-top` ของ SwipeCard (±0.7° วน 7s บน wrapper element เท่านั้น ไม่แตะ transform inline ของการ์ดเอง — 2026-08 amendment ที่ 2)
- **LandingView.vue คือหน้าเดียวที่ยกเว้นกฎ "instant"** — เป็นหน้า marketing ทางเข้าเว็บ ไม่ใช่เครื่องมือที่ใช้ซ้ำ อนุญาต scroll-reveal (`.reveal`/`.in`), mask-text hero, stat counter ได้เต็มที่ — ห้ามลามไปหน้าอื่น
- เคารพ `prefers-reduced-motion: reduce` — ข้าม animation ทั้งหมด

## Copy ใน UI (ทำงานคู่ plzgo-voice)
- Microcopy ใช้ metaphor สถานี: Board / Skip stop / Last stop / Unmarked stop / Interchange — ใช้ให้สม่ำเสมอทั้งแอป ห้ามสลับคำ
- ปุ่มขึ้นต้นด้วย verb บอกผลจริง: "Build my route" ไม่ใช่ "Get started"
- ความ sassy อยู่ใน insight text — ป้าย/ปุ่ม/label ต้องตรงไปตรงมาแบบป้ายจราจร

## Quality floor (ต้องผ่านก่อน deploy ทุกครั้ง)
Mobile-first ทดสอบที่ 360px ก่อน / contrast AA (ink บน paper ผ่านสบาย — ระวังส้มบนขาว ใช้ #C2540A สำหรับ**ตัวอักษร**ส้มบนพื้นสว่าง) / focus-visible ทุก interactive element / แผนที่ Leaflet: restyle marker เป็นวงสถานีสีตามเส้น — tile CartoDB Positron เข้ากับ direction นี้พอดี ไม่ต้องเปลี่ยน

## ลำดับ Rebuild (ทำทีละขั้น เทสก่อนไปต่อ)
1. `style.css` — วาง tokens ใหม่ ลบ liquid/glass/btn-ios/tab-bar เดิม (ทุกอย่างพังชั่วคราว = ปกติ)
2. `TimelineItem.vue` → StationRow (signature — ใช้ทั้ง ResultView/RouteView)
3. `ResultView.vue` + marker ใน `MapCanvas.vue` — หน้าที่ต้อง "ว้าว" ที่สุด เพราะเป็น output + หน้าที่คนแชร์
4. `BaseCampCard.vue` + `ContextPinCard.vue`
5. `SwipeView.vue` + `SwipeCard.vue` (ตั๋ว)
6. `HomeView.vue` (vibe picker = เลือกสาย)
7. `LandingView.vue` ทำท้ายสุด (ไฟล์ใหญ่สุด, marketing skin)
8. **อัปเดต Design System section ใน CLAUDE.md ให้ตรงกับไฟล์นี้** — ห้ามมี source of truth สองชุดอีก (สาเหตุหนึ่งของ drift รอบที่แล้ว)
