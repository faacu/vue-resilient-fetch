# 🛡️ Vue Resilient Async (Composable)

A robust, production-ready Vue 3 composable for handling asynchronous network requests. Designed to solve common frontend architectural pitfalls like memory leaks, race conditions, and poor network experiences.

## 🎯 The Problem it Solves
In modern single-page applications, simple `fetch` or Axios calls inside components often lead to:
1. **Memory Leaks & Race Conditions:** If a user navigates away before a request finishes, the component unmounts but the promise continues, attempting to update a destroyed view.
2. **Brittle Network Handling:** Micro-outages drop requests entirely without attempting a retry.
3. **Slow UX:** Users stare at loading spinners instead of seeing cached data while fresh data is fetched in the background.

## 💡 The Solution
`useResilientFetch` is an advanced Vue 3 composition utility that provides:
- **Auto-Cancellation:** Hooks into `onUnmounted` to trigger an `AbortController`, killing pending requests instantly and preventing state updates on destroyed components.
- **Stale-While-Revalidate (SWR):** Instantly returns cached memory data while silently fetching fresh data in the background.
- **Exponential Backoff Retries:** Automatically handles temporary network failures by retrying the request with increasing delays.
- **Performance Optimized:** Uses Vue's `shallowRef` instead of `ref` for payload data, avoiding the massive CPU overhead of deeply tracking large JSON API responses.

## 🚀 Quick Start / Usage

```vue
<script setup lang="ts">
import { onMounted } from 'vue'
import { useResilientFetch } from './composables/useResilientFetch'

interface User {
  id: number;
  name: string;
}

const { data, error, isFetching, execute, abort } = useResilientFetch<User[]>(
  '[https://jsonplaceholder.typicode.com/users](https://jsonplaceholder.typicode.com/users)',
  { retries: 3 } // Automatically retry 3 times on failure
)

onMounted(() => {
  execute()
})
</script>

<template>
  <div>
    <!-- Show cached or loading state -->
    <div v-if="isFetching && !data">Loading users...</div>
    
    <!-- Error handling -->
    <div v-else-if="error" class="error">
      Failed to load: {{ error.message }}
    </div>

    <!-- Data display (SWR means this shows immediately if cached) -->
    <ul v-if="data">
      <li v-for="user in data" :key="user.id">{{ user.name }}</li>
    </ul>
    
    <button @click="abort">Cancel Request manually</button>
  </div>
</template>