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
            className={`shrink-0 rounded-full border px-4 py-2 text-sm transition ${cat === c.id ? 'border-transparent bg-gradient-to-r from-[#a78bfa] via-[#8b5cf6] via-[55%] to-[#7c54f0] font-semibold text-[#0b0a12]' : 'border-accent/40 bg-panel text-[#b8b4c7] hover:border-accent'}`}>
            {c.name}
          </button>
        ))}
      </div>
      <div className={`grid gap-2 sm:gap-2.5 md:gap-3 ${cols}`}>
        {list.map((t) => <TemplateCard key={t.id} t={t} selected={selected?.id === t.id} onSelect={onSelect} />)}
      </div>
    </div>
  )
}
