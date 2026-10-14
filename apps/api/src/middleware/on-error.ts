import type { ErrorHandler } from 'hono'
import { HTTPException } from 'hono/http-exception'

// Ошибка клиента от Hono (битый JSON и т. п.) — его статус и текст, без error-лога.
// Неожиданная ошибка — в лог со стектрейсом, клиенту безликий 500.
export const onError: ErrorHandler = (err, c) => {
  if (err instanceof HTTPException && err.status < 500) {
    return c.json({ error: err.message }, err.status)
  }

  console.error(
    JSON.stringify({
      t: new Date().toISOString(),
      level: 'error',
      method: c.req.method,
      path: c.req.path,
      msg: err instanceof Error ? err.message : String(err),
      stack: err instanceof Error ? err.stack : undefined,
    }),
  )
  return c.json({ error: 'internal' }, 500)
}
