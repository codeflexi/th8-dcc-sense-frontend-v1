<template>
  <header class="h-16 bg-white border-b border-slate-200 px-8 flex items-center justify-between shrink-0 shadow-sm z-10">
    <div>
      <p class="text-[10px] uppercase tracking-wider text-slate-400 font-bold mb-0.5">Workspace</p>
      <h2 class="text-sm font-bold text-slate-800 flex items-center gap-2">
        Case Overview
        <span class="px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 text-[10px] font-mono">Q1-2026</span>
      </h2>
    </div>

    <div class="flex items-center gap-4">
      <div class="flex items-center gap-2 text-xs font-medium text-slate-500 bg-slate-50 px-3 py-1.5 rounded-md border border-slate-100">
        <span class="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
        System Online
      </div>
      <div class="h-4 w-px bg-slate-200"></div>
      <button class="text-slate-400 hover:text-primary transition">
        <span class="material-icons-outlined">notifications</span>
      </button>
      <button class="text-slate-400 hover:text-primary transition">
        <span class="material-icons-outlined">help_outline</span>
      </button>
    </div>
  </header>
</template>