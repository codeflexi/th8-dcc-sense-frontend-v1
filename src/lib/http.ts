// const BASE_URL = import.meta.env.VITE_API_URL || '';

// export const http = {
//   async get<T>(url: string): Promise<T> {
//     // ถ้า URL มี http นำหน้า (Full URL) ให้ใช้เลย ถ้าไม่มีให้ต่อ Base
//     const target = url.startsWith('http') ? url : `${BASE_URL}${url}`;
//     const res = await fetch(target, {
//       headers: { 
//         'Content-Type': 'application/json',
//         // 'Authorization': 'Bearer ...' // (เตรียมไว้ใส่ Token ในอนาคต)
//       }
//     });
//     if (!res.ok) throw new Error(`API Error ${res.status}`);
//     return res.json();
//   },

//   async post<T>(url: string, body: any): Promise<T> {
//     const target = url.startsWith('http') ? url : `${BASE_URL}${url}`;
//     const res = await fetch(target, {
//       method: 'POST',
//       headers: { 'Content-Type': 'application/json' },
//       body: JSON.stringify(body)
//     });
//     if (!res.ok) throw new Error(`API Error ${res.status}`);
//     return res.json();
//   }
// };

// src/lib/http.ts
type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'

export type HttpOptions = {
  headers?: Record<string, string>
  signal?: AbortSignal
}

function mergeHeaders(headers?: Record<string, string>) {
  return {
    'Content-Type': 'application/json',
    ...(headers || {}),
  }
}

async function request<T>(method: HttpMethod, url: string, body?: any, options?: HttpOptions): Promise<T> {
  const res = await fetch(url, {
    method,
    headers: mergeHeaders(options?.headers),
    body: body !== undefined ? JSON.stringify(body) : undefined,
    signal: options?.signal,
  })

  if (!res.ok) {
    // พยายามอ่าน error body ให้ได้ข้อความ
    let detail = ''
    try {
      detail = await res.text()
    } catch {}
    throw new Error(detail || `HTTP ${res.status} ${res.statusText}`)
  }

  // 204
  if (res.status === 204) return undefined as unknown as T

  return (await res.json()) as T
}

async function streamNdjson(
  url: string,
  body: any,
  onEvent: (ev: any) => void,
  options?: HttpOptions
): Promise<void> {
  const res = await fetch(url, {
    method: 'POST',
    headers: mergeHeaders(options?.headers),
    body: JSON.stringify(body),
    signal: options?.signal,
  })

  if (!res.ok) {
    let detail = ''
    try {
      detail = await res.text()
    } catch {}
    throw new Error(detail || `HTTP ${res.status} ${res.statusText}`)
  }

  if (!res.body) throw new Error('ReadableStream not supported.')

  const reader = res.body.getReader()
  const decoder = new TextDecoder('utf-8')
  let buffer = ''

  while (true) {
    const { done, value } = await reader.read()
    if (done) break

    buffer += decoder.decode(value, { stream: true })
    const lines = buffer.split('\n')
    buffer = lines.pop() || ''

    for (const line of lines) {
      if (!line.trim()) continue
      try {
        onEvent(JSON.parse(line))
      } catch {
        // ignore malformed line
      }
    }
  }
}

export const http = {
  get<T>(url: string, options?: HttpOptions) {
    return request<T>('GET', url, undefined, options)
  },
  post<T>(url: string, body?: any, options?: HttpOptions) {
    return request<T>('POST', url, body, options)
  },
  put<T>(url: string, body?: any, options?: HttpOptions) {
    return request<T>('PUT', url, body, options)
  },
  patch<T>(url: string, body?: any, options?: HttpOptions) {
    return request<T>('PATCH', url, body, options)
  },
  delete<T>(url: string, options?: HttpOptions) {
    return request<T>('DELETE', url, undefined, options)
  },

  // ⭐ streaming NDJSON (Copilot)
  streamNdjson,
}
