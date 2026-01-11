<script setup lang="ts">
import { useToast } from '@/composables/useToast';

const { toasts, removeToast } = useToast();

const getIcon = (type: string) => {
  switch (type) {
    case 'success': return 'check_circle';
    case 'error': return 'error';
    case 'warning': return 'warning';
    default: return 'info';
  }
};

const getStyles = (type: string) => {
  switch (type) {
    case 'success': return 'bg-white text-emerald-600 border-t-4 border-emerald-500';
    case 'error': return 'bg-white text-red-600 border-t-4 border-red-500';
    case 'warning': return 'bg-white text-amber-600 border-t-4 border-amber-500';
    default: return 'bg-white text-blue-600 border-t-4 border-blue-500';
  }
};

const getIconBg = (type: string) => {
    switch (type) {
    case 'success': return 'bg-emerald-100';
    case 'error': return 'bg-red-100';
    case 'warning': return 'bg-amber-100';
    default: return 'bg-blue-100';
  }
}
</script>

<template>
  <div v-if="toasts.length > 0" class="fixed inset-0 z-[9999] flex items-center justify-center pointer-events-none">
    
    <Transition 
      enter-active-class="transition-opacity duration-300"
      enter-from-class="opacity-0"
      enter-to-class="opacity-100"
      leave-active-class="transition-opacity duration-300"
      leave-from-class="opacity-100"
      leave-to-class="opacity-0"
    >
      <div v-if="toasts.length > 0" class="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"></div>
    </Transition>

    <div class="relative z-10 flex flex-col gap-4 items-center w-full max-w-md px-4 pointer-events-auto">
      <TransitionGroup 
        enter-active-class="transform ease-out duration-300 transition"
        enter-from-class="translate-y-8 opacity-0 scale-90"
        enter-to-class="translate-y-0 opacity-100 scale-100"
        leave-active-class="transition ease-in duration-200"
        leave-from-class="opacity-100 scale-100"
        leave-to-class="opacity-0 scale-95"
      >
        <div 
          v-for="toast in toasts" 
          :key="toast.id"
          class="w-full shadow-2xl rounded-xl overflow-hidden flex flex-col items-center text-center p-6 relative"
          :class="getStyles(toast.type)"
        >
          <div class="w-16 h-16 rounded-full flex items-center justify-center mb-4 shadow-sm" :class="getIconBg(toast.type)">
             <span class="material-icons-outlined text-4xl">{{ getIcon(toast.type) }}</span>
          </div>

          <h3 class="text-xl font-bold text-slate-800 mb-2">{{ toast.title }}</h3>
          <p class="text-sm text-slate-500 mb-6">{{ toast.message }}</p>

          <button 
            @click="removeToast(toast.id)"
            class="px-6 py-2 rounded-lg font-bold text-sm transition-colors border border-slate-200 hover:bg-slate-50 text-slate-600"
          >
            Close
          </button>

          <button @click="removeToast(toast.id)" class="absolute top-3 right-3 text-slate-300 hover:text-slate-500">
             <span class="material-icons-outlined">close</span>
          </button>
        </div>
      </TransitionGroup>
    </div>

  </div>
</template>