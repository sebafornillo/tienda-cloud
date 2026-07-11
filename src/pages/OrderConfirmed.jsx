import { Link, useLocation, useParams } from 'react-router-dom'

export default function OrderConfirmed() {
  const { orderNumber } = useParams()
  const { state } = useLocation()
  const whatsapp = state?.whatsapp

  return (
    <div className="screen-msg">
      <div className="check">✓</div>
      <h1>¡Pedido enviado!</h1>
      <p>
        Tu pedido <strong>#{orderNumber}</strong> fue recibido.
        {state?.name ? ` Gracias, ${state.name}.` : ''}
      </p>
      <p>La tienda lo va a confirmar en breve.</p>
      {whatsapp && (
        <a
          className="btn-primary"
          href={`https://wa.me/${whatsapp}?text=${encodeURIComponent(
            `Hola! Hice el pedido #${orderNumber}`
          )}`}
          target="_blank"
          rel="noreferrer"
        >
          Avisar por WhatsApp
        </a>
      )}
      <Link to="/" className="back">Volver a la tienda</Link>
    </div>
  )
}
