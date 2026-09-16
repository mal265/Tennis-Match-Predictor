import type { ReactNode } from 'react'

/** Building blocks shared by both research reports. */

export function Section({
  id,
  eyebrow,
  title,
  children,
}: {
  id: string
  eyebrow: string
  title: string
  children: ReactNode
}) {
  return (
    <section className="rsection" id={id}>
      <header className="rsection__head">
        <span className="rsection__eyebrow num">{eyebrow}</span>
        <h2 className="rsection__title display">{title}</h2>
      </header>
      {children}
    </section>
  )
}

export function Pullquote({ children }: { children: ReactNode }) {
  return <blockquote className="pullquote display">{children}</blockquote>
}

export function Callout({ title, children }: { title: string; children: ReactNode }) {
  return (
    <aside className="callout">
      <p className="callout__title">{title}</p>
      <p>{children}</p>
    </aside>
  )
}

export function Fact({
  term,
  detail,
  children,
}: {
  term: string
  detail: string
  children: ReactNode
}) {
  return (
    <div className="fact">
      <dt className="fact__term">{term}</dt>
      <dd className="fact__val num">{children}</dd>
      <dd className="fact__detail">{detail}</dd>
    </div>
  )
}

export function Method({ term, children }: { term: string; children: ReactNode }) {
  return (
    <div className="methods__item">
      <dt>{term}</dt>
      <dd>{children}</dd>
    </div>
  )
}
