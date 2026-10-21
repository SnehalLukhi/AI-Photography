<<<<<<< HEAD
import { createContext, useContext, useEffect, useState } from 'react'
import { getAuthToken, setAuthToken, fetchMe } from '../lib/aiPhotography.js'
=======
import { createContext, useContext, useEffect, useRef, useState } from 'react'
>>>>>>> cc72fa45a8496ff7bc337414c4fbb34f7d355ace

const Ctx = createContext(null)
export const useStudio = () => useContext(Ctx)

// "First sign-in" memory: demo-only, kept in this browser's localStorage per e-mail (there are no real accounts or backend yet). Returns true once per e-mail.
const SEEN_KEY = 'pixora-welcome-seen'
function firstSignIn(email) {
  const id = String(email || 'guest').trim().toLowerCase()
  try {
    const seen = JSON.parse(localStorage.getItem(SEEN_KEY) || '[]')
    if (seen.includes(id)) return false
    localStorage.setItem(SEEN_KEY, JSON.stringify([...seen, id]))
  } catch { /* storage blocked: show it for this session only */ }
  return true
}

const PREMIUM_DELAY_MS = 2000

// The welcome-coin amount shown by the Welcome popup and the header coin badge. DISPLAY ONLY: the app has no coin balance, so nothing is credited or tracked.
export const WELCOME_COINS = 50

// DEMO AUTHENTICATION ONLY (not secure production auth): there is no auth provider or backend, so "signed in" is just a flag. It is kept in this browser's
// localStorage so it survives refresh / closing the browser until it expires or the user logs out from the profile menu. Only { email, expiresAt } is stored - never a password or any secret.
const SESSION_KEY = 'pixora-session'
const SESSION_DAYS = 30
function readSession() { // synchronous, so the signed-in state is correct on the very first render (no flash of the Login page)
  try {
    const s = JSON.parse(localStorage.getItem(SESSION_KEY) || 'null')
    if (s && typeof s.email === 'string' && s.expiresAt > Date.now()) return s
    localStorage.removeItem(SESSION_KEY)
  } catch { /* storage unavailable or corrupt: signed out */ }
  return null
}
const clearSession = () => { try { localStorage.removeItem(SESSION_KEY) } catch { /* ignore */ } }
const writeSession = (email) => { try { localStorage.setItem(SESSION_KEY, JSON.stringify({ email, expiresAt: Date.now() + SESSION_DAYS * 864e5 })) } catch { /* ignore */ } }

export function StudioProvider({ children }) {
  const [template, setTemplate] = useState(null)
  const [photo, setPhotoState] = useState(null) // { url, name }

  const [gender, setGender] = useState('All') // UI-only filter state
<<<<<<< HEAD
  const [user, setUser] = useState(null) // { id, email, name } of the logged-in user
  const [authReady, setAuthReady] = useState(!getAuthToken()) // false while a saved token is being checked
  useEffect(() => { // a token saved by an earlier visit: still valid?
    if (!getAuthToken()) return
    fetchMe().then(setUser).catch((e) => { if (e.status === 401) setAuthToken('') }).finally(() => setAuthReady(true))
  }, [])
  const signIn = ({ token, user: u }) => { setAuthToken(token); setUser(u) }
  const refreshUser = () => fetchMe().then(setUser).catch(() => {}) // coin balance after a generation, a redeem or a purchase
  const signOut = () => { setAuthToken(''); setUser(null); setCreations([]) }
=======
  const [signedIn, setSignedIn] = useState(() => !!readSession()) // demo flag restored from the saved demo session
  const [userEmail, setUserEmail] = useState(() => readSession()?.email || '') // e-mail of the signed-in demo user (read-only profile info for the header menu)
  const [welcomeOffer, setWelcomeOffer] = useState(false) // welcome popup: opened right after a FIRST sign-in only, closed by the user
  const [premiumOffer, setPremiumOffer] = useState(false) // premium pricing popup: opens PREMIUM_DELAY_MS after the welcome popup has been closed, never at the same time
  const premiumTimer = useRef(null)
  const clearPremiumTimer = () => { clearTimeout(premiumTimer.current); premiumTimer.current = null }
  useEffect(() => clearPremiumTimer, [])
  const closeWelcomeOffer = () => {
    setWelcomeOffer(false)
    if (premiumTimer.current) return // already scheduled: never a second timer
    premiumTimer.current = setTimeout(() => { premiumTimer.current = null; setPremiumOffer(true) }, PREMIUM_DELAY_MS)
  }
>>>>>>> cc72fa45a8496ff7bc337414c4fbb34f7d355ace
  const [creations, setCreations] = useState([])
  const addCreation = (c) => setCreations((l) => [{ id: `new-${Date.now()}`, date: 'Just now', ...c }, ...l])

  const setPhoto = (file) => {
    if (photo) URL.revokeObjectURL(photo.url)
    setPhotoState(file ? { url: URL.createObjectURL(file), name: file.name } : null)
  }

<<<<<<< HEAD
  return <Ctx.Provider value={{ template, setTemplate, photo, setPhoto, creations, setCreations, addCreation, signedIn: !!user, user, coins: user?.coins ?? 0, refreshUser, authReady, gender, setGender, signIn, signOut }}>{children}</Ctx.Provider>
=======
  return <Ctx.Provider value={{ template, setTemplate, photo, setPhoto, creations, addCreation, signedIn, gender, setGender, welcomeOffer, closeWelcomeOffer, premiumOffer, closePremiumOffer: () => setPremiumOffer(false), userEmail, signOut: () => { clearSession(); clearPremiumTimer(); setSignedIn(false); setUserEmail(''); setWelcomeOffer(false); setPremiumOffer(false) }, signIn: (email) => { const e = String(email || 'guest').trim().toLowerCase(); writeSession(e); setUserEmail(e); setSignedIn(true); if (firstSignIn(email)) setWelcomeOffer(true) } }}>{children}</Ctx.Provider>
>>>>>>> cc72fa45a8496ff7bc337414c4fbb34f7d355ace
}
