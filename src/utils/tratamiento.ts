// Cuántas tomas al día implica una frecuencia, ej. "cada 8 horas" -> 3.
export function dosesPerDay(frequency: string): number {
  if (!frequency) return 1;

  const perDay = frequency.match(/(\d+)\s*veces?\s*(?:al|por)\s*(?:día|dia|dias|días)/i);
  if (perDay) {
    const n = parseInt(perDay[1], 10);
    if (n >= 1 && n <= 6) return n;
  }

  const every = frequency.match(/cada\s+(\d+)\s*(?:hora|horas)/i);
  if (every) {
    const hours = parseInt(every[1], 10);
    if (hours > 0) return Math.max(1, Math.min(6, Math.round(24 / hours)));
  }

  return 1;
}

// Devuelve la duración más larga entre los medicamentos (texto original)
// para mostrarla como "duración total" del tratamiento, o null si ninguna.
export function maxDurationText(durations: string[]): string | null {
  let bestDays = 0;
  let best: string | null = null;
  for (const duracion of durations) {
    const match = duracion?.toLowerCase().match(/(\d+)\s*(día|dia|dias|días|semana|semanas|mes|meses)/i);
    if (!match) continue;
    const n = parseInt(match[1], 10);
    const unit = match[2].toLowerCase();
    const unitDays = unit.startsWith('sem') ? 7 : unit.startsWith('mes') ? 30 : 1;
    const days = n * unitDays;
    if (days > bestDays) {
      bestDays = days;
      best = duracion;
    }
  }
  return best;
}