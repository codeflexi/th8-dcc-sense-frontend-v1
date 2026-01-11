# TH8 Procurement Decision Center (Frontend)

![Version](https://img.shields.io/badge/version-1.0.0-blue.svg) ![Vue](https://img.shields.io/badge/Vue.js-3.x-4FC08D.svg) ![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178C6.svg)

Web Application สำหรับตรวจสอบและอนุมัติการจัดซื้อด้วย AI (AI-Powered Procurement Audit) พัฒนาเพื่อช่วย CFO และ Audit Director ในการตรวจจับความผิดปกติ (Anomaly Detection) เช่น Split PO หรือการทุจริต

## ✨ Key Features

1.  **Case Portfolio:** Dashboard แสดงรายการเคสที่ต้องตรวจสอบ คัดกรองด้วยความเสี่ยง (Risk Level)
2.  **Decision & Rules Engine:** หน้าจออนุมัติงาน พร้อมผลวิเคราะห์จาก AI และรายละเอียดกฎ (Rules) ที่ถูกละเมิด
3.  **Audit Timeline:** เส้นเวลาการทำงาน (Immutable Log) แสดงประวัติการแก้ไขที่ตรวจสอบย้อนหลังได้
4.  **Evidence Trace:** ระบบตรวจสอบเอกสาร (Document Viewer) พร้อม AI Highlight จุดที่ผิดปกติ

## 🛠 Tech Stack

* **Framework:** Vue 3 (Composition API, `<script setup>`)
* **Build Tool:** Vite
* **Language:** TypeScript (Strict Mode)
* **Styling:** Tailwind CSS (Custom "TH8" Theme Tokens)
* **State Management:** Pinia
* **Routing:** Vue Router
* **Icons:** Material Icons Outlined
* **Fonts:** Prompt (UI), IBM Plex Mono (Data/Code)

## 🚀 Getting Started

### Prerequisites
* Node.js (v18.0.0 or higher)
* npm or yarn

### Installation

```bash
# Clone the repository
git clone <repository_url>

# Navigate to project directory
cd th8-procurement-ui

# Install dependencies
npm install# th8-dcc-frontend-v1
