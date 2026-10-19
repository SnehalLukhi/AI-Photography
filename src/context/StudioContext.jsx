import { createContext, useContext, useState } from 'react'
import { demoCreations } from '../data/templates.js'

const Ctx = createContext(null)
export const useStudio = () => useContext(Ctx)

export function StudioProvider({ children }) {
  const [template, setTemplate] = useState(null)
  const [photo, setPhotoState] = useState(null) // { url, name }

  const [gender, setGender] = useState('All') // UI-only filter state
  const [signedIn, setSignedIn] = useState(false) // frontend demo flag only - no auth
  const [creations, setCreations] = useState(demoCreations)
  const addCreation = (c) => setCreations((l) => [{ id: `new-${Date.now()}`, date: 'Just now', ...c }, ...l])

  const setPhoto = (file) => {
    if (photo) URL.revokeObjectURL(photo.url)
    setPhotoState(file ? { url: URL.createObjectURL(file), name: file.name } : null)
  }

  return <Ctx.Provider value={{ template, setTemplate, photo, setPhoto, creations, addCreation, signedIn, gender, setGender, signIn: () => setSignedIn(true), signOut: () => setSignedIn(false) }}>{children}</Ctx.Provider>
}
