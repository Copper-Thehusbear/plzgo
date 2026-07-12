---
name: plzgo-interaction-engineering
description: วิศวกรสาย logic/function ของ plzgo — gesture physics, Vue 3 interaction patterns, performance, debugging ใช้เมื่อแตะ SwipeCard/gesture, ทำ animation เชิง logic, ไล่บั๊ก interaction, หรือ feature ที่ต้อง "รู้สึกดี" ไม่ใช่แค่ทำงานได้ Trigger: "swipe ไม่ลื่น", "ยังไม่ดี", "กระตุก", "gesture", "logic", "physics"
---

# plzgo Interaction Engineering

## หลักคิด
"ทำงานได้" ≠ "รู้สึกดี" — ความรู้สึกดีของ interaction มาจากฟิสิกส์ 3 อย่าง: **ตามนิ้วทันที / เคารพโมเมนตัม / คืนตัวแบบสปริง** ทุก gesture ในแอปต้องผ่านทั้งสามข้อ

---

## Swipe Physics Spec v2 (สำหรับ SwipeCard.vue)

### A. Velocity tracking (สิ่งที่ v1 ไม่มี — สำคัญสุด)
- เก็บ history ของ pointermove: `{x, y, t}` ล่าสุด ~5 จุด หรือภายใน 100ms
- ตอน pointerup คำนวณ `vx = Δx/Δt` (px/ms) จากจุดแรกใน window ถึงจุดปล่อย
- **เงื่อนไข commit (ผ่านข้อใดข้อหนึ่ง):**
  1. `|dragX| > 0.28 × cardWidth` (แทน 75px ตายตัว — สัมพันธ์ขนาดจอ)
  2. `|vx| > 0.55 px/ms` และทิศเดียวกับ dragX (สะบัดสั้นแต่เร็ว = ผ่าน)

### B. ตามนิ้ว 2 แกน + การหมุนแบบมีจุดจับ
- `translateX = dx` เต็ม / `translateY = dy × 0.35` (damped — ตามนิ้วแต่ไม่หลุดแนว)
- Rotation: `rot = (dx / cardWidth) × 14°` และ**คูณ grabFactor**: จับครึ่งบนการ์ด = +1, ครึ่งล่าง = −1 (บันทึกจาก startY ตอน pointerdown) — การ์ดจะเหวี่ยงคนละทางตามตำแหน่งมือเหมือนของจริง

### C. Exit ต้องรับโมเมนตัมต่อ
- ระยะบิน: พ้นจอ + 100px ตามเวกเตอร์ (dx, dy×0.35) เดิม
- **Duration แปรตามความเร็วปล่อย:** `clamp(remainingDistance / max(|vx|, 1.2), 200, 400)` ms — ปัดแรงบินไว ดันช้าบินช้า
- Easing: `cubic-bezier(0.17, 0.67, 0.35, 1)` (linear-out — ออกตัวด้วยความเร็วเดิม)
- จบด้วย `transitionend` แล้วค่อย emit (คง setTimeout ไว้เป็น fallback ที่ duration+80ms กันจอ background ไม่ยิง event)

### D. Snap-back แบบสปริง
- `cubic-bezier(0.175, 0.885, 0.32, 1.15)` 300ms (overshoot เล็กน้อย) — รีเซ็ต x, y, rot พร้อมกัน
- ห้ามใช้ easing เดียวกับ exit — สองอารมณ์นี้ต้องต่างกัน

### E. Deck ต้องหายใจ
- การ์ดใบหลัง: `scale 0.94→1` + `translateY 10px→0` ผูกกับ `dragProgress` ของใบบน (linear) — ตอนใบบนบินออก ใบหลังต้องอยู่ที่ scale 1 พอดี ไม่ "เด้งโผล่"
- Stamp BOARD / SKIP STOP: opacity = dragProgress เริ่มโผล่ที่ progress 0.1

### F. สิ่งที่ v1 ทำถูกแล้ว — ห้ามพังตอน refactor
- Gesture lock h/v พร้อม bias แนวตั้ง 1.3× (กันปัดพลาดตอน scroll เนื้อหา)
- `setPointerCapture` + release ตอน lock = 'v'
- กัน pointerdown บน `button, a`
- Tap ครึ่งซ้าย/ขวาของรูปเพื่อเปลี่ยนรูป (logic isTap)
- `defineExpose({ triggerExit })` — ปุ่มภายนอกเรียกใช้ ต้องคงชื่อและพฤติกรรม

### G. Reduced motion
`prefers-reduced-motion: reduce` → exit = fade 150ms + เลื่อนสั้น 40px, ตัด rotation/spring ทั้งหมด

---

## กติกา Performance (ทุก interaction ไม่ใช่แค่ swipe)
1. Animate เฉพาะ `transform` และ `opacity` — แตะ layout property (width/top/height) ใน hot path = จบ
2. ใน pointermove: อัปเดต ref ให้น้อยที่สุด ห้ามมี watcher/computed หนักผูกกับค่า drag — ถ้ายังกระตุกบนมือถือกลางๆ ให้เขียน `el.style.transform` ตรงผ่าน rAF (bypass Vue reactivity เฉพาะจุดนี้ พร้อมคอมเมนต์เหตุผล)
3. `will-change: transform` ใส่เฉพาะการ์ดใบบน ใบเดียว — ใส่ทั้ง deck = เปลือง memory
4. เทสบนมือถือ Android กลางๆ ผ่าน throttle CPU 4× ใน DevTools ก่อนถือว่าผ่าน — เครื่อง dev ลื่นไม่นับ

## กติกา Logic ทั่วไป (Vue 3 / โปรเจกต์นี้)
- Component ที่อยู่ใน `<Transition>` ต้องมี root element เดียว (ContextPinCard เคยพังเพราะเรื่องนี้)
- State ข้าม view อยู่ที่ Pinia (`useTripStore`) เท่านั้น — ห้ามแอบเก็บใน component แล้ว sync มือ
- ทุก external URL ต้องผ่าน validation แบบ `safeAffiliateLink` pattern (new URL + เช็ค protocol)
- อ่านข้อมูล place: มี fallback chain เสมอ (`name_en || name`) เพราะข้อมูลบางแถวไม่ครบ — ห้าม assume field มีค่า
- แก้ gesture logic แล้วต้องเทส 6 ท่าเสมอ: ปัดช้าเกินเส้น / ปัดช้าไม่ถึงเส้น / สะบัดเร็วสั้น / ปัดแล้วลากกลับมาปล่อยที่เดิม / scroll แนวตั้งบนการ์ด / tap เปลี่ยนรูป

## วิธีไล่บั๊ก interaction (ลำดับตายตัว)
1. **Reproduce ให้ได้ก่อน** — ท่าไหน อุปกรณ์ไหน ความถี่เท่าไหร่
2. **Instrument** — log `{event, dx, dy, vx, lock, phase}` ทุก transition ของ state machine ชั่วคราว
3. **Isolate** — ปัญหาอยู่ที่ input (pointer events), state (lock/flags), หรือ output (CSS transition)? แก้ทีละชั้น
4. แก้แล้วรันเทส 6 ท่าครบ ก่อนลบ log
