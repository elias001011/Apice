export function getCurrentEnemYear(referenceDate = new Date()) {
  const year = Number(referenceDate?.getFullYear?.())
  return Number.isFinite(year) ? year : new Date().getFullYear()
}

export function getEnemYearLabel(referenceDate = new Date()) {
  return `ENEM ${getCurrentEnemYear(referenceDate)}`
}
