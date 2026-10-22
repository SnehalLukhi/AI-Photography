import { useRef, useState } from 'react'

export default function PhotoUpload({ photo, onChange }) {
  const input = useRef()
  const [drag, setDrag] = useState(false)
  const [error, setError] = useState('')

  const handle = (file) => {
    if (!file) return
    if (!file.type.startsWith('image/')) return setError('Please choose an image file (JPG or PNG).')
    if (file.size > 20 * 1024 * 1024) return setError('Image must be under 20 MB.')
    setError('')
    onChange(file)
  }

  return (
    <div>
      <div
        onClick={() => !photo && input.current.click()}
        onDragOver={(e) => { e.preventDefault(); setDrag(true) }}
        onDragLeave={() => setDrag(false)}
        onDrop={(e) => { e.preventDefault(); setDrag(false); handle(e.dataTransfer.files[0]) }}
        className={`grid min-h-[240px] place-items-center overflow-hidden rounded-xl border-2 border-dashed p-4 text-center transition ${photo ? '' : 'cursor-pointer'} ${drag ? 'border-pink bg-pink/10' : 'border-accent/50 bg-panel hover:border-accent'}`}
      >
        {photo ? (
          <img src={photo.url} alt="Your upload" className="max-h-[380px] w-full rounded-xl object-contain" />
        ) : (
          <div>
            <div className="mx-auto mb-3 grid size-14 place-items-center rounded-full border border-accent bg-accent/10 text-2xl">⇪</div>
            <p className="font-medium">Tap to upload or drag a photo</p>
            <p className="mt-1 text-sm text-[#A0A0A0]">JPG, PNG up to 20MB</p>
          </div>
        )}
      </div>
      <input ref={input} type="file" accept="image/png,image/jpeg,image/webp" hidden onChange={(e) => { handle(e.target.files[0]); e.target.value = '' }} />
      {photo && (
        <div className="mt-3 flex gap-2">
          <button className="btn-dark !rounded-xl !px-4 !py-2 text-sm" onClick={() => input.current.click()}>Change photo</button>
          <button className="btn-dark !rounded-xl !px-4 !py-2 text-sm" onClick={() => onChange(null)}>Remove</button>
        </div>
      )}
      {error && <p className="mt-2 text-sm text-red-400">{error}</p>}
    </div>
  )
}
