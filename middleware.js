export const config = {
    matcher: '/((?!api|assets|.*\\..*).*)',
  }
  
  const BOT_UA = /whatsapp|facebookexternalhit|twitterbot|slackbot|telegrambot|linkedinbot|discordbot|pinterest/i
  
  export default async function middleware(request) {
    const ua = request.headers.get('user-agent') || ''
    if (!BOT_UA.test(ua)) return // humano normal: no tocar nada
  
    const host = request.headers.get('host') || ''
    const subdomain = host.split('.')[0]
    if (!subdomain || subdomain === 'www' || subdomain === 'fornistore') return // fornistore.com usa su OG de siempre
  
    const SUPABASE_URL = process.env.SUPABASE_URL
    const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY
    if (!SUPABASE_URL || !SUPABASE_ANON_KEY) return
  
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/tenants?select=name,settings&subdomain=eq.${subdomain}&is_active=eq.true`,
      { headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${SUPABASE_ANON_KEY}` } }
    )
    const rows = await res.json()
    const tenant = rows?.[0]
    if (!tenant) return
  
    const html = await fetch(new URL('/index.html', request.url)).then((r) => r.text())
  
    const name = tenant.name
    const desc = tenant.settings?.tagline || 'Tu tienda online'
    const image = tenant.settings?.banner_url || tenant.settings?.logo_url || ''
    const url = `https://${host}/`
  
    const patched = html
      .replace(/<meta property="og:title" content=".*?" \/>/, `<meta property="og:title" content="${name}" />`)
      .replace(/<meta property="og:description" content=".*?" \/>/, `<meta property="og:description" content="${desc}" />`)
      .replace(/<meta property="og:image" content=".*?" \/>/, `<meta property="og:image" content="${image}" />`)
      .replace(/<meta property="og:url" content=".*?" \/>/, `<meta property="og:url" content="${url}" />`)
      .replace(/<title>.*?<\/title>/, `<title>${name}</title>`)
  
    return new Response(patched, { headers: { 'content-type': 'text/html; charset=utf-8' } })
  }