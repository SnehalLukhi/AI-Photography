import { useState } from 'react'
import { categories, templates } from '../data/templates.js'
import TemplateCard from './TemplateCard.jsx'

export default function TemplateGallery({ selected, onSelect, initial = 'all', cols = 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5' }) {
  const [cat, setCat] = useState(initial)
  const chips = [{ id: 'all', name: 'All' }, ...categories]
  const list = templates.filter((t) => cat === 'all' || t.category === cat)
  return (
    <div>
      <div className="no-scrollbar -mx-4 mb-5 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:px-0">
        {chips.map((c) => (
          <button key={c.id} onClick={() => setCat(c.id)}
            className={`shrink-0 chip ${cat === c.id ? 'chip-on' : ''}`}>
            {c.name}
          </button>
        ))}
      </div>
      <div className={`grid gap-x-2.5 gap-y-4 sm:gap-x-3 ${cols}`}>
        {list.map((t) => <TemplateCard key={t.id} t={t} selected={selected?.id === t.id} onSelect={onSelect} />)}
      </div>
    </div>
  )
}
