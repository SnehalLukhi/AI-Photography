const P = {
  home: 'M3 11l9-8 9 8M5 10v10h5v-6h4v6h5V10',
  users: 'M16 19v-1a4 4 0 00-4-4H7a4 4 0 00-4 4v1M9.5 10a3.5 3.5 0 100-7 3.5 3.5 0 000 7zM21 19v-1a4 4 0 00-3-3.9M16 3.1a3.5 3.5 0 010 6.8',
  card: 'M3 7a2 2 0 012-2h14a2 2 0 012 2v10a2 2 0 01-2 2H5a2 2 0 01-2-2zM3 10h18M7 15h3',
  folder: 'M3 7a2 2 0 012-2h4l2 2h8a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2z',
  image: 'M4 5h16v14H4zM4 16l5-5 4 4 3-3 4 4M9 9.5a1 1 0 100-.01',
  flame: 'M12 3c1 3 5 5 5 10a5 5 0 01-10 0c0-2 1-3 2-4 0 2 1 3 2 3 0-3-1-5 1-9z',
  plus: 'M12 5v14M5 12h14',
  edit: 'M4 20h4L19 9l-4-4L4 16zM13.5 6.5l4 4',
  trash: 'M5 7h14M10 7V4h4v3M7 7l1 13h8l1-13M10 11v6M14 11v6',
  search: 'M11 18a7 7 0 100-14 7 7 0 000 14zM20 20l-4-4',
  x: 'M6 6l12 12M18 6L6 18',
  check: 'M5 12.5l4.5 4.5L19 7',
  star: 'M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1L3.2 9.5l6.1-.9z',
  up: 'M12 19V5M6 11l6-6 6 6',
  down: 'M12 5v14M6 13l6 6 6-6',
  grip: 'M9 6h.01M9 12h.01M9 18h.01M15 6h.01M15 12h.01M15 18h.01',
  refresh: 'M20 11a8 8 0 00-14.5-4M4 5v4h4M4 13a8 8 0 0014.5 4M20 19v-4h-4',
  logout: 'M15 4h3a2 2 0 012 2v12a2 2 0 01-2 2h-3M10 8l-4 4 4 4M6 12h11',
  menu: 'M4 7h16M4 12h16M4 17h16',
  chevron: 'M9 6l6 6-6 6',
  upload: 'M12 16V4M7 9l5-5 5 5M4 17v2a1 1 0 001 1h14a1 1 0 001-1v-2',
  grid: 'M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z',
  coin: 'M12 21a9 9 0 100-18 9 9 0 000 18zM12 8v8M9.5 10.5c0-1 1-1.5 2.5-1.5s2.5.6 2.5 1.6S13 12 12 12s-2.5.5-2.5 1.6 1 1.6 2.5 1.6 2.5-.6 2.5-1.6',
  lock: 'M6 11h12v9H6zM8.5 11V8a3.5 3.5 0 017 0v3',
  link: 'M10 14a4 4 0 005.7 0l3-3a4 4 0 00-5.7-5.7l-1 1M14 10a4 4 0 00-5.7 0l-3 3A4 4 0 0011 18.7l1-1',
  play: 'M8 5v14l11-7z',
  bolt: 'M13 3L5 13h6l-1 8 8-10h-6z',
  copy: 'M8 8h11v12H8zM5 16V4h11',
}

export function Icon({ name, className = 'size-5', strokeWidth = 1.8 }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill={name === 'star-fill' ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d={name === 'star-fill' ? P.star : P[name] || P.grid} />
    </svg>
  )
}
