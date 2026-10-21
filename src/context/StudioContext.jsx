import { createContext, useContext, useEffect, useState } from 'react'
import { getAuthToken, setAuthToken, fetchMe } from '../lib/aiPhotography.js'

const Ctx = createContext(null)
export const useStudio = () => useContext(Ctx)

export function StudioProvider({ children }) {
  const [template, setTemplate] = useState(null)
  const [photo, setPhotoState] = useState(null) // { url, name }

  const [gender, setGender] = useState('All') // UI-only filter state
  const [user, setUser] = useState(null) // { id, email, name } of the logged-in user
  const [authReady, setAuthReady] = useState(!getAuthToken()) // false while a saved token is being checked
  useEffect(() => { // a token saved by an earlier visit: still valid?
    if (!getAuthToken()) return
    fetchMe().then(setUser).catch((e) => { if (e.status === 401) setAuthToken('') }).finally(() => setAuthReady(true))
  }, [])
  const signIn = ({ token, user: u }) => { setAuthToken(token); setUser(u) }
  const refreshUser = () => fetchMe().then(setUser).catch(() => {}) // coin balance after a generation, a redeem or a purchase
  const signOut = () => { setAuthToken(''); setUser(null); setCreations([]) }
  const [creations, setCreations] = useState([])
  const addCreation = (c) => setCreations((l) => [{ id: `new-${Date.now()}`, date: 'Just now', ...c }, ...l])

  const setPhoto = (file) => {
    if (photo) URL.revokeObjectURL(photo.url)
    setPhotoState(file ? { url: URL.createObjectURL(file), name: file.name } : null)
  }

  return <Ctx.Provider value={{ template, setTemplate, photo, setPhoto, creations, setCreations, addCreation, signedIn: !!user, user, coins: user?.coins ?? 0, refreshUser, authReady, gender, setGender, signIn, signOut }}>{children}</Ctx.Provider>
}
