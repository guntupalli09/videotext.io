export const config = {
  matcher: ['/'],
}

export default async function middleware(request: Request) {
  const accept = request.headers.get('accept') || ''
  if (!accept.includes('text/markdown')) return

  try {
    const llmsUrl = new URL('/llms.txt', request.url)
    const res = await fetch(llmsUrl)
    if (!res.ok) return

    const markdown = await res.text()
    return new Response(markdown, {
      status: 200,
      headers: {
        'Content-Type': 'text/markdown; charset=utf-8',
        'x-markdown-tokens': String(markdown.split(/\s+/).length),
      },
    })
  } catch {
    return
  }
}
