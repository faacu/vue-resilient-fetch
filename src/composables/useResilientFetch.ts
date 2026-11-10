import { shallowRef, ref, onUnmounted, type ShallowRef, type Ref } from 'vue'

// Caché en memoria básico. En una app real, esto podría inyectarse vía Provide/Inject
const fetchCache = new Map<string, any>()

interface ResilientOptions extends RequestInit {
  retries?: number;
  useCache?: boolean;
}

interface UseResilientFetchReturn<T> {
  data: ShallowRef<T | null>;
  error: Ref<Error | null>;
  isFetching: Ref<boolean>;
  execute: () => Promise<void>;
  abort: () => void;
}

export function useResilientFetch<T>(
  url: string, 
  options: ResilientOptions = {}
): UseResilientFetchReturn<T> {
  const data = shallowRef<T | null>(null)
  const error = ref<Error | null>(null)
  const isFetching = ref(false)
  
  const { retries = 2, useCache = true, ...fetchOptions } = options
  let abortController = new AbortController()

  const execute = async (currentAttempt = 0) => {
    isFetching.value = true
    error.value = null

    // Patrón Stale-While-Revalidate: Si hay caché, lo mostramos primero
    if (useCache && fetchCache.has(url)) {
      data.value = fetchCache.get(url)
    }

    // Renovamos el controlador en caso de re-ejecución
    abortController = new AbortController()

    try {
      const response = await fetch(url, {
        ...fetchOptions,
        signal: abortController.signal
      })

      if (!response.ok) {
        throw new Error(`HTTP Error: ${response.status}`)
      }

      const result = await response.json()
      data.value = result
      if (useCache) fetchCache.set(url, result)

    } catch (err: any) {
      // Ignoramos el error si fue una cancelación intencional (ej. componente desmontado)
      if (err.name === 'AbortError') {
        console.warn(`[ResilientFetch] Petición abortada: ${url}`)
        return
      }

      // Exponential Backoff para reintentos
      if (currentAttempt < retries) {
        const delay = Math.pow(2, currentAttempt) * 1000
        console.log(`[ResilientFetch] Fallo de red. Reintentando en ${delay}ms...`)
        await new Promise(resolve => setTimeout(resolve, delay))
        return execute(currentAttempt + 1)
      }

      error.value = err
    } finally {
      isFetching.value = false
    }
  }

  // Prevención de Memory Leaks y Race Conditions
  onUnmounted(() => {
    abortController.abort()
  })

  return { 
    data, 
    error, 
    isFetching, 
    execute,
    abort: () => abortController.abort() 
  }
}