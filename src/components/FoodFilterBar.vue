<script setup>
import { FOOD_FILTERS } from '@/composables/useFoodGuide'

defineProps({
  modelQuery:  { type: String, default: '' },
  activeId:    { type: String, default: 'all' },
  count:       { type: Number, default: 0 },
  total:       { type: Number, default: 0 },
})
const emit = defineEmits(['update:modelQuery', 'select', 'surprise'])
</script>

<template>
  <div class="ff">
    <div class="ff-row">
      <label class="ff-search">
        <i class="fa-solid fa-magnifying-glass" aria-hidden="true"></i>
        <input
          type="search"
          :value="modelQuery"
          placeholder="Search a dish, a street, a vibe…"
          aria-label="Search places"
          @input="emit('update:modelQuery', $event.target.value)"
        />
      </label>

      <!-- The brand thesis as a button: this whole product exists to stop you
           deliberating, so the guide gets to decide for you too. -->
      <button class="ff-surprise" @click="emit('surprise')">
        <span class="ff-dice" aria-hidden="true">◆</span> Pick for me
      </button>
    </div>

    <div class="ff-chips" role="group" aria-label="Filter places">
      <button
        v-for="f in FOOD_FILTERS"
        :key="f.id"
        class="ff-chip data-mono"
        :class="{ on: activeId === f.id }"
        :aria-pressed="activeId === f.id"
        @click="emit('select', f.id)"
      >{{ f.label }}</button>

      <span class="ff-count data-mono">{{ count }}<template v-if="count !== total"> / {{ total }}</template></span>
    </div>
  </div>
</template>

<style scoped>
.ff { margin-bottom: 26px; }

.ff-row {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
  margin-bottom: 12px;
}

.ff-search {
  flex: 1 1 260px;
  display: flex;
  align-items: center;
  gap: 11px;
  background: #fff;
  border: 1px solid var(--hairline);
  border-radius: 999px;
  padding: 0 18px;
  height: 48px;
  box-shadow: var(--shadow-sm);
  transition: border-color 0.15s, box-shadow 0.2s;
}
.ff-search:focus-within {
  border-color: var(--ink);
  box-shadow: var(--shadow-md);
}
.ff-search i { color: var(--muted); font-size: 13px; flex: none; }
.ff-search input {
  flex: 1;
  min-width: 0;
  border: none;
  outline: none;
  background: transparent;
  font-family: 'IBM Plex Sans Thai', sans-serif;
  font-size: 14.5px;
  font-weight: 600;
  color: var(--ink);
}
.ff-search input::placeholder { color: var(--muted); font-weight: 500; }
.ff-search input::-webkit-search-cancel-button { cursor: pointer; }

.ff-surprise {
  flex: none;
  height: 48px;
  padding: 0 22px;
  border: none;
  border-radius: 999px;
  background: var(--ink);
  color: #fff;
  font-family: 'IBM Plex Sans Thai', sans-serif;
  font-size: 14px;
  font-weight: 700;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 9px;
  transition: transform 0.2s ease-out, box-shadow 0.2s ease-out, background 0.15s;
}
.ff-surprise:hover { transform: translateY(-2px); box-shadow: var(--shadow-md); background: #26344f; }
.ff-surprise:active { transform: translateY(1px); box-shadow: none; }
.ff-dice { color: var(--signal); font-size: 11px; }

.ff-chips {
  display: flex;
  gap: 7px;
  flex-wrap: wrap;
  align-items: center;
}
.ff-chip {
  font-size: 11px;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  padding: 9px 15px;
  border-radius: 999px;
  border: 1px solid var(--hairline);
  background: #fff;
  color: var(--muted);
  cursor: pointer;
  transition: all 0.18s ease-out;
}
.ff-chip:hover { border-color: var(--ink); color: var(--ink); }
.ff-chip.on {
  background: var(--ink);
  border-color: var(--ink);
  color: #fff;
}
.ff-count {
  margin-left: auto;
  font-size: 11px;
  color: var(--muted);
  white-space: nowrap;
}

@media (max-width: 560px) {
  .ff-surprise { flex: 1 1 100%; justify-content: center; }
  .ff-count { margin-left: 0; width: 100%; }
}
</style>
