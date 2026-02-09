// src/features/cases/stores/context.store.ts
// หมายเหตุ: ไฟล์นี้ “ไม่ควรใช้แล้ว” ตาม architecture ใหม่
// เก็บไว้เพื่อไม่ทำให้ import เก่าพัง (ถ้ามีเหลืออยู่ที่อื่น)
// ถ้าคุณยืนยันว่าไม่มีที่ไหนใช้แล้ว สามารถลบไฟล์ได้ในรอบถัดไป

import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useCaseContextStore = defineStore('case-context', () => {
  const loading = ref(false)
  const error = ref<string | null>(null)
  const header = ref<any>(null)
  const groups = ref<any[]>([])
  const rules = ref<any[]>([])
  const decision = ref<any>(null)

  async function load() {
    throw new Error('case-context store is deprecated. Use CaseDetailView + domain views.')
  }

  function reset() {
    header.value = null
    groups.value = []
    rules.value = []
    decision.value = null
    error.value = null
  }

  return { loading, error, header, groups, rules, decision, load, reset }
})
