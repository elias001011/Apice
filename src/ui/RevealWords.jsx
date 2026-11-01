import { Fragment, useEffect, useRef, useState } from 'react'

/**
 * Título com revelação palavra por palavra.
 * - O espaço fica FORA do span inline-block, senão as palavras grudam.
 * - Dispara por IntersectionObserver e também por setTimeout (abas em segundo
 *   plano não rodam requestAnimationFrame, então o timeout garante o fim).
 * - prefers-reduced-motion é tratado no CSS (tudo aparece de imediato).
 */
// eslint-disable-next-line no-unused-vars -- Tag é usado como elemento JSX
export function RevealWords({ text, as: Tag = 'span', className = '', stagger = 55 }) {
  const ref = useRef(null)
  const [shown, setShown] = useState(false)

  useEffect(() => {
    const node = ref.current
    let done = false
    const show = () => {
      if (done) return
      done = true
      setShown(true)
    }
    const fallback = window.setTimeout(show, 700)
    let observer = null
    if (node && 'IntersectionObserver' in window) {
      observer = new IntersectionObserver((entries) => {
        if (entries.some((entry) => entry.isIntersecting)) show()
      }, { threshold: 0.1 })
      observer.observe(node)
    }
    return () => {
      window.clearTimeout(fallback)
      observer?.disconnect()
    }
  }, [])

  const words = String(text ?? '').split(' ').filter(Boolean)

  return (
    <Tag ref={ref} className={`reveal-words${shown ? ' is-in' : ''} ${className}`.trim()} aria-label={text}>
      {words.map((word, index) => (
        <Fragment key={`${word}-${index}`}>
          {index > 0 && ' '}
          <span className="rw" aria-hidden="true">
            <i style={{ transitionDelay: `${index * stagger}ms` }}>{word}</i>
          </span>
        </Fragment>
      ))}
    </Tag>
  )
}
