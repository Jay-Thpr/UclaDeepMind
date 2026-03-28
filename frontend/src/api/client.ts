const apiBase = import.meta.env.VITE_API_URL ?? ''

export type HealthResponse = { status: string }

export async function fetchHealth(): Promise<HealthResponse> {
  const url = `${apiBase}/api/health`
  const res = await fetch(url)
  if (!res.ok) {
    throw new Error(`Health check failed: ${res.status}`)
  }
  return res.json() as Promise<HealthResponse>
}
