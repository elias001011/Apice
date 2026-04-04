import enemCalendar from '../data/enemCalendar.json'
import { getCurrentEnemYear } from './examYear.js'

export const ENEM_MANUAL_DATE_KEY = 'apice:enem-date'
const ENEM_MANUAL_DATE_UPDATED_EVENT = 'apice:enem-date-updated'

function canUseStorage() {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined'
}

function isValidDate(date) {
  return date instanceof Date && Number.isFinite(date.getTime())
}

function normalizeDateValue(value) {
  const text = String(value ?? '').trim()
  if (!text) return null

  const brMatch = text.match(/^(\d{2})\/(\d{2})\/(\d{4})$/)
  if (brMatch) {
    const [, day, month, year] = brMatch
    const date = new Date(Number(year), Number(month) - 1, Number(day))
    return isValidDate(date) ? date : null
  }

  const isoMatch = text.match(/^(\d{4})-(\d{2})-(\d{2})$/)
  if (isoMatch) {
    const [, year, month, day] = isoMatch
    const date = new Date(Number(year), Number(month) - 1, Number(day))
    return isValidDate(date) ? date : null
  }

  const parsed = new Date(text)
  if (!isValidDate(parsed)) return null
  return new Date(parsed.getFullYear(), parsed.getMonth(), parsed.getDate())
}

function startOfLocalDay(date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate())
}

function isSameLocalDay(a, b) {
  if (!isValidDate(a) || !isValidDate(b)) return false
  return (
    a.getFullYear() === b.getFullYear()
    && a.getMonth() === b.getMonth()
    && a.getDate() === b.getDate()
  )
}

function formatDateLabel(date) {
  if (!isValidDate(date)) return ''

  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(date)
}

function formatDateRangeLabel(dates) {
  const values = Array.isArray(dates) ? dates.filter(isValidDate) : []
  if (values.length === 0) return ''
  if (values.length === 1) return formatDateLabel(values[0])
  if (values.length === 2) {
    return `${formatDateLabel(values[0])} e ${formatDateLabel(values[1])}`
  }

  return values.map((date) => formatDateLabel(date)).join(', ')
}

function buildCountdown(referenceDate, targetDate) {
  const diff = targetDate.getTime() - referenceDate.getTime()
  if (diff <= 0) {
    return { months: 0, days: 0, hours: 0, minutes: 0 }
  }

  const totalSeconds = Math.floor(diff / 1000)
  const totalMinutes = Math.floor(totalSeconds / 60)
  const totalHours = Math.floor(totalMinutes / 60)
  const totalDays = Math.floor(totalHours / 24)

  return {
    months: Math.floor(totalDays / 30),
    days: totalDays % 30,
    hours: totalHours % 24,
    minutes: totalMinutes % 60,
  }
}

function loadManualDate() {
  if (!canUseStorage()) return ''

  try {
    return String(localStorage.getItem(ENEM_MANUAL_DATE_KEY) || '').trim()
  } catch {
    return ''
  }
}

export function saveManualEnemDate(value) {
  if (!canUseStorage()) return

  const nextValue = String(value ?? '').trim()
  if (nextValue) {
    localStorage.setItem(ENEM_MANUAL_DATE_KEY, nextValue)
  } else {
    localStorage.removeItem(ENEM_MANUAL_DATE_KEY)
  }

  window.dispatchEvent(new CustomEvent(ENEM_MANUAL_DATE_UPDATED_EVENT))
}

export function loadManualEnemDate() {
  return loadManualDate()
}

function getCalendarDatesForYear(year) {
  if (enemCalendar?.disable) return []

  const yearConfig = enemCalendar?.years?.[String(year)]
  if (!yearConfig || typeof yearConfig !== 'object') return []

  const rawDates = Array.isArray(yearConfig.days)
    ? yearConfig.days
    : Array.isArray(yearConfig.dates)
      ? yearConfig.dates
      : []

  const parsed = rawDates
    .map((item) => normalizeDateValue(item))
    .filter(isValidDate)
    .sort((a, b) => a.getTime() - b.getTime())

  return parsed.filter((date, index, array) => {
    if (index === 0) return true
    return date.getTime() !== array[index - 1].getTime()
  })
}

function buildEmptyState(referenceDate) {
  return {
    source: 'manual',
    year: getCurrentEnemYear(referenceDate),
    badge: 'Data pendente',
    copy: 'Defina a data oficial manualmente para manter a contagem atualizada.',
    dateLabel: '',
    dateRangeLabel: '',
    nextDateLabel: '',
    status: 'empty',
    countdown: { months: 0, days: 0, hours: 0, minutes: 0 },
    canEditManual: true,
    showEditor: false,
    isCalendarMode: false,
    isToday: false,
    isPast: false,
    hasSavedDate: false,
  }
}

function buildManualState(referenceDate, manualDate) {
  const parsedDate = normalizeDateValue(manualDate)
  if (!parsedDate) {
    return buildEmptyState(referenceDate)
  }

  const today = startOfLocalDay(referenceDate)
  const target = startOfLocalDay(parsedDate)
  const isToday = isSameLocalDay(referenceDate, parsedDate)
  const isPast = today.getTime() > target.getTime()

  return {
    source: 'manual',
    year: getCurrentEnemYear(referenceDate),
    badge: isToday ? 'Dia da prova' : 'Data salva',
    copy: isToday
      ? 'Hoje é o dia da prova!'
      : `Data manual salva: ${formatDateLabel(parsedDate)}.`,
    dateLabel: formatDateLabel(parsedDate),
    dateRangeLabel: formatDateLabel(parsedDate),
    nextDateLabel: formatDateLabel(parsedDate),
    status: isToday ? 'today' : isPast ? 'past' : 'countdown',
    countdown: buildCountdown(referenceDate, parsedDate),
    canEditManual: true,
    showEditor: false,
    isCalendarMode: false,
    isToday,
    isPast,
    hasSavedDate: true,
  }
}

function buildCalendarState(referenceDate, year, dates) {
  const today = startOfLocalDay(referenceDate)
  const rangeLabel = formatDateRangeLabel(dates)
  const todayMatch = dates.find((date) => isSameLocalDay(date, referenceDate))
  const lastDate = dates[dates.length - 1]

  if (todayMatch) {
    return {
      source: 'calendar',
      year,
      badge: 'Dia da prova',
      copy: 'Hoje é o dia da prova!',
      dateLabel: rangeLabel,
      dateRangeLabel: rangeLabel,
      nextDateLabel: formatDateLabel(todayMatch),
      status: 'today',
      countdown: { months: 0, days: 0, hours: 0, minutes: 0 },
      canEditManual: false,
      showEditor: false,
      isCalendarMode: true,
      isToday: true,
      isPast: false,
      hasSavedDate: true,
    }
  }

  const nextDate = dates.find((date) => startOfLocalDay(date).getTime() >= today.getTime()) || lastDate
  const isPast = today.getTime() > startOfLocalDay(lastDate).getTime()

  return {
    source: 'calendar',
    year,
    badge: isPast ? 'Prova concluída' : 'Calendário automático',
    copy: isPast
      ? `O calendário oficial do ENEM ${year} já passou.`
      : `Calendário oficial: ${rangeLabel}.`,
    dateLabel: rangeLabel,
    dateRangeLabel: rangeLabel,
    nextDateLabel: formatDateLabel(nextDate),
    status: isPast ? 'past' : 'countdown',
    countdown: buildCountdown(referenceDate, nextDate),
    canEditManual: false,
    showEditor: false,
    isCalendarMode: true,
    isToday: false,
    isPast,
    hasSavedDate: true,
  }
}

export function getEnemCalendarState({
  referenceDate = new Date(),
  manualDate = loadManualEnemDate(),
} = {}) {
  const year = getCurrentEnemYear(referenceDate)
  const dates = getCalendarDatesForYear(year)

  if (dates.length > 0) {
    return buildCalendarState(referenceDate, year, dates)
  }

  return buildManualState(referenceDate, manualDate)
}
