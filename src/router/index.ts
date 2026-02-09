// src/router/index.ts
import { createRouter, createWebHashHistory } from 'vue-router'
import AppShell from '@/components/layout/AppShell.vue'
import CopilotWorkstationView from '@/features/copilot/views/CopilotWorkstationView.vue'

const router = createRouter({
  history: createWebHashHistory(),
  routes: [
    {
      path: '/',
      component: AppShell,
      redirect: '/cases',
      children: [
        // ================= CASE LIST =================
        {
          path: 'cases',
          name: 'CasePortfolio',
          component: () => import('@/features/cases/views/CasePortfolioView.vue'),
        },

        {
          path: 'cases/new',
          name: 'CaseIngest',
          component: () => import('@/features/cases/views/CaseIngestView.vue'),
        },

        // ================= CASE DETAIL SHELL =================
        {
          path: 'cases/:caseId',
          component: () => import('@/features/cases/views/CaseDetailView.vue'),
          props: true,

          children: [
            // 🔴 DEFAULT = Decision Run
            {
              path: '',
              name: 'CaseDecision',
              component: () => import('@/features/decision-run/views/DecisionRunView.vue'),
              props: true,
            },

            // Evidence tab
            {
              path: 'evidence',
              name: 'CaseEvidence',
              component: () => import('@/features/evidence/views/EvidenceView.vue'),
              props: true,
            },

            // Audit tab
            {
              path: 'audit',
              name: 'CaseAudit',
              component: () => import('@/features/audit/views/AuditTimelineView.vue'),
              props: true,
            },
          ],
        },

        // ================= SYSTEM =================
        {
          path: 'system',
          name: 'SystemControl',
          component: () => import('@/features/admin/views/SystemControlView.vue'),
        },
        {
          path: 'system/policy-editor',
          name: 'PolicyStudio',
          component: () => import('@/features/admin/views/PolicyStudioView.vue'),
        },

        // ================= COPILOT =================
        {
          path: 'copilot',
          name: 'copilot',
          component: CopilotWorkstationView,
        },
      ],
    },
  ],
})

export default router
