<script setup lang="ts">
import type { EvidenceItem, EvidenceDocument } from '@/features/decision-run/types'
import { computed } from 'vue'
import { useDecisionRunStore } from '@/features/decision-run/store'

const props = defineProps<{
  evidence: EvidenceItem
  document?: EvidenceDocument
}>()

const store = useDecisionRunStore()

const page = computed(() =>
  props.evidence.source_page ??
  props.evidence.price_items?.[0]?.page_number ??
  1
)

function openPdf() {
  store.openPdf(props.evidence.document_id, page.value)
}
</script>

<template>
  <div class="border border-slate-200 rounded-2xl p-4 bg-white space-y-3">

    <!-- Document -->
    <div class="flex items-start justify-between gap-3">
      <div>
        <div class="text-sm font-extrabold text-slate-900">
          {{ document?.file_name || evidence.document_id }}
        </div>
        <div class="text-xs text-slate-500 font-mono">
          page {{ page }} · {{ evidence.extraction_method || '—' }}
        </div>
      </div>

      <button
        class="px-3 py-2 rounded-lg bg-slate-900 text-white text-xs font-bold hover:bg-slate-800"
        @click="openPdf"
      >
        View PDF
      </button>
    </div>

    <!-- Claim -->
    <div class="bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm">
      <div class="font-bold text-slate-700 mb-1">
        Evidence claim
      </div>

      <div v-if="evidence.source_snippet" class="font-mono text-xs text-slate-700">
        {{ evidence.source_snippet }}
      </div>

      <div v-else-if="evidence.price_items?.[0]">
        <div class="font-bold text-slate-900">
          {{ evidence.price_items[0].sku }} · {{ evidence.price_items[0].item_name }}
        </div>
        <div class="text-slate-700">
          {{ evidence.price_items[0].unit_price }}
          {{ evidence.price_items[0].currency }}
        </div>
      </div>
    </div>

    <!-- Meta -->
    <div class="flex items-center justify-between text-xs text-slate-500">
      <span>confidence {{ evidence.confidence ?? '—' }}</span>
      <span class="font-bold">anchor: {{ evidence.anchor_type }}</span>
    </div>

  </div>
</template>
