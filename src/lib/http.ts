const BASE_URL = import.meta.env.VITE_API_URL || '';

export const http = {
  async get<T>(url: string): Promise<T> {
    // ถ้า URL มี http นำหน้า (Full URL) ให้ใช้เลย ถ้าไม่มีให้ต่อ Base
    const target = url.startsWith('http') ? url : `${BASE_URL}${url}`;
    const res = await fetch(target, {
      headers: { 
        'Content-Type': 'application/json',
        // 'Authorization': 'Bearer ...' // (เตรียมไว้ใส่ Token ในอนาคต)
      }
    });
    if (!res.ok) throw new Error(`API Error ${res.status}`);
    return res.json();
  },

  async post<T>(url: string, body: any): Promise<T> {
    const target = url.startsWith('http') ? url : `${BASE_URL}${url}`;
    const res = await fetch(target, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    if (!res.ok) throw new Error(`API Error ${res.status}`);
    return res.json();
  }
};