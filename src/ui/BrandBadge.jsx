import logoBranca from '../assets/brand/connecta-logo-branca.svg'
import logoPreta from '../assets/brand/connecta-logo-preta.svg'
import hostingerDark from '../assets/brand/hostinger-partner-badge-dark.svg'
import hostingerLight from '../assets/brand/hostinger-partner-badge-light.svg'

const HOSTINGER_URL = 'https://www.hostinger.com/br?REFERRALCODE=HNWPKDASIGKR'

// As duas variantes ficam no DOM; o CSS escolhe qual aparece (sem flash).
export function BrandBadge() {
  return (
    <div className="brand-badge">
      <a href="https://connectabr.digital/portfolio/" target="_blank" rel="noreferrer">
        <img className="brand-badge-logo for-dark" src={logoBranca} alt="Connecta Digital" />
        <img className="brand-badge-logo for-light" src={logoPreta} alt="Connecta Digital" />
      </a>
      <span className="brand-badge-sep" aria-hidden="true" />
      <a href={HOSTINGER_URL} target="_blank" rel="sponsored noopener noreferrer">
        <img className="brand-badge-hostinger for-dark" src={hostingerDark} width="120" height="45" alt="Hostinger Partner" />
        <img className="brand-badge-hostinger for-light" src={hostingerLight} width="120" height="45" alt="Hostinger Partner" />
      </a>
    </div>
  )
}
