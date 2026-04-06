const HOST = process.env.NEXT_PUBLIC_API_HOST || 'http://localhost:3001'

export async function get(url: string) {
  const res = await fetch(`${HOST}${url}`)
  const data = res.json()
  return data
}

export async function post(url: string, body: any) {
  const res = await fetch(`${HOST}${url}`, {
    method: 'post',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  })
  const data = res.json()
  return data
}
