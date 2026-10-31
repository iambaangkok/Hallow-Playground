import type { ClientMsg, PublicPlayground, ServerMsg } from '../shared/protocol'

const API = `${import.meta.env.BASE_URL}api`

export async function createPlayground(isPublic: boolean): Promise<string> {
  const res = await fetch(`${API}/playgrounds`, { method: 'POST', body: JSON.stringify({ public: isPublic }) })
  if (!res.ok) throw new Error('Could not create a playground. Try again.')
  return ((await res.json()) as { code: string }).code
}

export async function playgroundExists(code: string): Promise<boolean> {
  return (await fetch(`${API}/playgrounds/${code}`)).ok
}

export async function listPublic(): Promise<PublicPlayground[]> {
  const res = await fetch(`${API}/public`)
  return res.ok ? ((await res.json()) as PublicPlayground[]) : []
}

export type Connection = { send: (m: ClientMsg) => void; close: () => void }

/** Joins a Playground and reconnects on drop, re-sending the join each time. */
export function connect(
  code: string,
  join: Extract<ClientMsg, { t: 'join' }>,
  onMessage: (m: ServerMsg) => void,
  onStatus: (s: 'open' | 'reconnecting' | 'gone') => void,
): Connection {
  let ws: WebSocket
  let closed = false
  let retry = 0
  const url = `${location.protocol === 'https:' ? 'wss' : 'ws'}://${location.host}${API}/playgrounds/${code}/ws`

  const open = () => {
    ws = new WebSocket(url)
    ws.onopen = () => {
      retry = 0
      ws.send(JSON.stringify(join))
      onStatus('open')
    }
    ws.onmessage = (e) => onMessage(JSON.parse(e.data) as ServerMsg)
    ws.onclose = () => {
      if (closed) return
      if (retry > 8) return onStatus('gone')
      onStatus('reconnecting')
      setTimeout(open, Math.min(4000, 400 * 2 ** retry++))
    }
  }
  open()

  return {
    send: (m) => ws.readyState === WebSocket.OPEN && ws.send(JSON.stringify(m)),
    close: () => {
      closed = true
      ws.close()
    },
  }
}
