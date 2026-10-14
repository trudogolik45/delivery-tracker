import type { ErrorHandler } from 'hono'
import { HTTPException } from 'hono/http-exception'

// Наружу отдаём только 400 от Hono (битый JSON): его текст — константа без внутренностей.
// Любой другой HTTPException (401/403 и т. п.) остаётся безликим 500 — иначе текст и
// различимый статус утекут клиенту, например 401 вместо 404 у /internal/*.
// Неожиданная ошибка — в лог со стектрейсом, клиенту безликий 500.
export const onError: ErrorHandler = (err, c) => {
  if (err instanceof HTTPException && err.status === 400) {
    return c.json({ error: err.message }, 400)
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
