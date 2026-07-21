// Pantalla de carga con identidad.
// Mientras la app pregunta qué tienda es, todavía no conoce su logo:
// por eso guardamos la marca en el navegador (App.jsx) y la reusamos acá.
export default function LoadingScreen() {
    const host = typeof window !== 'undefined' ? window.location.hostname : ''
    const isFornistore = /^(www\.)?fornistore\.com$/.test(host)
  
    let brand = null
    try {
      const raw = localStorage.getItem(`fs_brand_${host}`)
      if (raw) brand = JSON.parse(raw)
    } catch {}
  
    const color = brand?.color || '#4a5d33'
  
    return (
      <div className={isFornistore ? 'load-screen dark' : 'load-screen'}>
        <style>{`
          .load-screen {
            position: fixed;
            inset: 0;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            gap: 18px;
            background: #f7f3e8;
          }
          .load-screen.dark { background: #14120e; }
  
          /* --- Logo de la tienda girando dentro de su anillo --- */
          .load-brand {
            position: relative;
            width: 108px;
            height: 108px;
            display: flex;
            align-items: center;
            justify-content: center;
          }
          .load-ring {
            position: absolute;
            inset: 0;
            border-radius: 50%;
            border: 3px solid color-mix(in srgb, var(--load-c) 18%, transparent);
            border-top-color: var(--load-c);
            animation: load-spin 0.9s linear infinite;
          }
          .load-logo {
            width: 82px;
            height: 82px;
            border-radius: 50%;
            object-fit: cover;
            animation: load-turn 3.2s cubic-bezier(0.6, 0, 0.4, 1) infinite;
          }
          .load-dot {
            width: 62px;
            height: 62px;
            border-radius: 50%;
            background: var(--load-c);
            opacity: 0.18;
            animation: load-pulse 1.4s ease-in-out infinite;
          }
          @keyframes load-spin { to { transform: rotate(360deg); } }
          @keyframes load-turn {
            0% { transform: rotate(0deg); }
            70%, 100% { transform: rotate(360deg); }
          }
          @keyframes load-pulse {
            0%, 100% { transform: scale(0.9); opacity: 0.15; }
            50% { transform: scale(1); opacity: 0.3; }
          }
  
          /* --- Logo Fornistore: módulos latiendo --- */
          .load-f .lb {
            animation: load-blink 1.5s ease-in-out infinite;
          }
          .load-f .lb:nth-of-type(2) { animation-delay: 0.09s; }
          .load-f .lb:nth-of-type(3) { animation-delay: 0.18s; }
          .load-f .lb:nth-of-type(4) { animation-delay: 0.27s; }
          .load-f .lb:nth-of-type(5) { animation-delay: 0.36s; }
          .load-f .lb:nth-of-type(6) { animation-delay: 0.45s; }
          .load-f .lb:nth-of-type(7) { animation-delay: 0.54s; }
          .load-f .lb:nth-of-type(8) { animation-delay: 0.72s; }
          @keyframes load-blink {
            0%, 100% { opacity: 0.35; }
            40% { opacity: 1; }
          }
  
          .load-text {
            font-size: 0.9rem;
            letter-spacing: 0.16em;
            text-transform: uppercase;
            color: #a49e90;
            margin: 0;
          }
          .load-screen.dark .load-text { color: #6b665a; }
  
          @media (prefers-reduced-motion: reduce) {
            .load-ring, .load-logo, .load-dot, .load-f .lb { animation: none; }
          }
        `}</style>
  
        {isFornistore ? (
          <svg
            className="load-f"
            width="86"
            height="86"
            viewBox="0 0 512 512"
            xmlns="http://www.w3.org/2000/svg"
            aria-label="Fornistore"
          >
            <rect width="512" height="512" rx="112" fill="#1f1d18" />
            <rect className="lb" x="138" y="108" width="74" height="74" rx="16" fill="#f5efdf" />
            <rect className="lb" x="226" y="108" width="74" height="74" rx="16" fill="#f5efdf" />
            <rect className="lb" x="314" y="108" width="74" height="74" rx="16" fill="#f5efdf" />
            <rect className="lb" x="138" y="196" width="74" height="74" rx="16" fill="#f5efdf" />
            <rect className="lb" x="138" y="284" width="74" height="74" rx="16" fill="#f5efdf" />
            <rect className="lb" x="226" y="284" width="74" height="74" rx="16" fill="#f5efdf" />
            <rect className="lb" x="138" y="372" width="74" height="74" rx="16" fill="#f5efdf" />
            <rect className="lb" x="314" y="372" width="74" height="74" rx="16" fill="#1d9e75" />
          </svg>
        ) : (
          <div className="load-brand" style={{ '--load-c': color }}>
            <span className="load-ring" />
            {brand?.logo ? (
              <img className="load-logo" src={brand.logo} alt="" />
            ) : (
              <span className="load-dot" />
            )}
          </div>
        )}
  
        <p className="load-text">{brand?.name || 'Cargando'}</p>
      </div>
    )
  }
  