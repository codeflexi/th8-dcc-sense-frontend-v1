<script setup lang="ts">
import AppSidebar from './AppSidebar.vue'
import AppHeader from './AppHeader.vue'
</script>

<template>
  <div class="flex h-screen w-full bg-slate-50 font-sans text-slate-800">

    <!-- SIDEBAR -->
    <AppSidebar />

    <!-- RIGHT SIDE -->
    <div class="flex flex-col flex-1 min-w-0 h-screen">

      <AppHeader />

      <!-- 🔥 IMPORTANT: ต้อง flex + overflow -->
      <main class="flex-1 min-h-0 flex flex-col">

        <!-- 🔥 scroll container -->
        <div class="flex-1 min-h-0 overflow-y-auto">

          <RouterView v-slot="{ Component, route }">
            <Transition
              name="page"
              mode="out-in"
              enter-active-class="animate-enter"
              leave-active-class="animate-leave"
            >
              <!-- 🔥 KEY FIX: full height container -->
              <div class="min-h-full w-full">
                <component :is="Component" :key="route.fullPath" />
              </div>

            </Transition>
          </RouterView>

        </div>

      </main>

    </div>
  </div>
</template>
