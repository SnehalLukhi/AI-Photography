import { Link, Navigate } from 'react-router-dom'
import { useStudio } from '../context/StudioContext.jsx'

export default function Result() {
  const { template, photo, setTemplate, setPhoto } = useStudio()
  if (!template || !photo) return <Navigate to="/studio" replace />

  return (
    <section className="mx-auto max-w-none px-4 py-8 pb-32 sm:px-6 md:pb-12">
      <h1 className="text-3xl font-semibold tracking-tight sm:text-5xl">Your <span className="grad-text">Result</span></h1>

      <div className="grid items-start gap-6 md:grid-cols-[1fr_1.2fr_1fr]">
        <figure>
          <img src={photo.url} alt="Your photo" className="aspect-[3/4] w-full rounded-xl border border-[#3A3552] bg-panel object-cover" />
          <figcaption className="mt-2 text-center text-sm text-[#C4B5FD]/75">Your photo</figcaption>
        </figure>
        <figure className="order-first md:order-none">
          <div className="relative aspect-[3/4] overflow-hidden rounded-xl border border-accent shadow-[0_0_40px_rgba(176,112,250,0.3)]">
            <img src={template.image} alt="" className="absolute inset-0 h-full w-full object-contain" />
            <img src={photo.url} alt="" className="absolute inset-0 h-full w-full object-cover opacity-60 mix-blend-overlay" />
          </div>
          <figcaption className="mt-2 text-center text-sm font-medium">Generated result</figcaption>
        </figure>
        <figure>
          <img src={template.image} alt={template.name} className="aspect-[3/4] w-full rounded-xl border border-[#3A3552] object-contain bg-[#000000]" />
          <figcaption className="mt-2 text-center text-sm text-[#C4B5FD]/75">Template: {template.name}</figcaption>
        </figure>
      </div>

      <div className="mt-10 flex flex-col justify-center gap-3 sm:flex-row">
        <button className="btn-grad">⬇ Download</button>
        <Link to="/studio" className="btn-dark">Try Another Template</Link>
        <Link to="/studio" onClick={() => setPhoto(null)} className="btn-dark">Use a Different Photo</Link>
        <Link to="/" onClick={() => { setTemplate(null); setPhoto(null) }} className="btn-dark">Back Home</Link>
      </div>
    </section>
  )
}
