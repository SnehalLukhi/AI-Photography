import { createContext, useContext, useEffect, useRef, useState } from 'react'
import { getAuthToken, setAuthToken, fetchMe, listFavorites, setFavorite } from '../lib/aiPhotography.js'

const Ctx = createContext(null)
export const useStudio = () => useContext(Ctx)

// "First sign-in" memory for the welcome popup: kept in this browser's localStorage per e-mail. Returns true once per e-mail.
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

// The last known user, kept so a refresh renders the logged-in UI on the very first paint (no logged-out flash while /me is checked). It is only trusted
// together with a saved login token, and is replaced by the server's answer right after.
const USER_KEY = 'ai-photo-user'
const cachedUser = () => {
  if (!getAuthToken()) return null
  try { return JSON.parse(localStorage.getItem(USER_KEY) || 'null') } catch { return null }
}
const cacheUser = (u) => { try { u ? localStorage.setItem(USER_KEY, JSON.stringify(u)) : localStorage.removeItem(USER_KEY) } catch { /* storage blocked */ } }

const PREMIUM_DELAY_MS = 2000
const OFFER_DELAY_MS = 600 // pause between dismissing the premium popup and the special-offer popup

// The welcome-coin amount shown by the Welcome popup (a new account really gets this many coins from the backend: SIGNUP_BONUS_COINS).
export const WELCOME_COINS = 100

export function StudioProvider({ children }) {
  const [template, setTemplate] = useState(null)
  const [photo, setPhotoState] = useState(null) // { url, name }

  const [gender, setGender] = useState('All') // UI-only filter state
  const [user, setUser] = useState(cachedUser) // { id, email, name, coins } of the logged-in user (real login: see src/lib/aiPhotography.js)
  const [authReady, setAuthReady] = useState(!getAuthToken()) // false while a saved login token is being checked
  useEffect(() => { // a token saved by an earlier visit: still valid?
    if (!getAuthToken()) return
    fetchMe().then(setUser).catch((e) => { if (e.status === 401) { setAuthToken(''); setUser(null) } }).finally(() => setAuthReady(true))
  }, [])
  useEffect(() => { if (authReady || user) cacheUser(user) }, [user, authReady])
  const [loginOpen, setLoginOpen] = useState(false) // the sign-in popup (components/LoginModal.jsx)
  const [welcomeOffer, setWelcomeOffer] = useState(false) // welcome popup: opened right after a FIRST sign-in only, closed by the user
  const [premiumOffer, setPremiumOffer] = useState(false) // premium pricing popup: opens PREMIUM_DELAY_MS after the welcome popup has been closed, never at the same time
  const [offerPopup, setOfferPopup] = useState(false) // special-offer popup: opens OFFER_DELAY_MS after the premium popup is dismissed (not after a purchase)
  const premiumTimer = useRef(null)
  const offerTimer = useRef(null)
  const clearPremiumTimer = () => { clearTimeout(premiumTimer.current); premiumTimer.current = null; clearTimeout(offerTimer.current); offerTimer.current = null }
  useEffect(() => clearPremiumTimer, [])
  const closeWelcomeOffer = () => {
    setWelcomeOffer(false)
    if (premiumTimer.current) return // already scheduled: never a second timer
    premiumTimer.current = setTimeout(() => { premiumTimer.current = null; setPremiumOffer(true) }, PREMIUM_DELAY_MS)
  }
  // Liked templates: the database is the source of truth (loaded after login / refresh); the per-user copy in localStorage only fills the hearts
  // on the first paint, and a failed load or save never wipes what is shown.
  const favKey = (u) => `pictrify-favs-${u}`
  const [favorites, setFavorites] = useState(() => { try { return new Set(JSON.parse(localStorage.getItem(favKey(cachedUser()?.id)) || '[]')) } catch { return new Set() } })
  const [favoritesReady, setFavoritesReady] = useState(false)
  const favUser = user?.id
  const writeFavs = (u, set) => { try { localStorage.setItem(favKey(u), JSON.stringify([...set])) } catch { /* storage blocked */ } }
  useEffect(() => {
    if (!favUser || !authReady) { setFavoritesReady(false); return }
    let live = true
    try { setFavorites(new Set(JSON.parse(localStorage.getItem(favKey(favUser)) || '[]'))) } catch { /* ignore */ }
    listFavorites().then((ids) => { if (!live) return; const set = new Set(ids); setFavorites(set); writeFavs(favUser, set); setFavoritesReady(true) }).catch(() => {})
    return () => { live = false }
  }, [favUser, authReady])
  const toggleFavorite = async (templateId) => {
    if (!favUser) return false
    const on = !favorites.has(templateId)
    const apply = (v) => setFavorites((cur) => { const n = new Set(cur); v ? n.add(templateId) : n.delete(templateId); writeFavs(favUser, n); return n })
    apply(on) // instant, rolled back if the server says no
    try { await setFavorite(templateId, on) } catch (e) { apply(!on); if (e.status === 401) { setAuthToken(''); setUser(null) } return false }
    return true
  }
  const [creations, setCreations] = useState([])
  const addCreation = (c) => setCreations((l) => [{ id: `new-${Date.now()}`, date: 'Just now', ...c }, ...l])

  const signIn = ({ token, user: u }) => { setAuthToken(token); setUser(u); setLoginOpen(false); if (firstSignIn(u.email)) setWelcomeOffer(true) }
  const refreshUser = () => fetchMe().then(setUser).catch(() => {}) // coin balance after a generation, a redeem or a purchase
  const signOut = () => { setFavorites(new Set()); setFavoritesReady(false); setAuthToken(''); clearPremiumTimer(); setUser(null); setCreations([]); setWelcomeOffer(false); setPremiumOffer(false); setOfferPopup(false) }

  const setPhoto = (file) => {
    if (photo) URL.revokeObjectURL(photo.url)
    setPhotoState(file ? { url: URL.createObjectURL(file), name: file.name } : null)
  }

  return <Ctx.Provider value={{
    favorites, favoritesReady, toggleFavorite,
    template, setTemplate, photo, setPhoto, creations, setCreations, addCreation, gender, setGender,
    signedIn: !!user, user, userEmail: user?.email || '', coins: user?.coins ?? 0, refreshUser, authReady, signIn, signOut, loginOpen, openLogin: () => setLoginOpen(true), closeLogin: () => setLoginOpen(false),
    welcomeOffer, closeWelcomeOffer, premiumOffer, closePremiumOffer: (purchased = false) => {
      setPremiumOffer(false)
      if (purchased !== true && !offerTimer.current) offerTimer.current = setTimeout(() => { offerTimer.current = null; setOfferPopup(true) }, OFFER_DELAY_MS)
    },
    offerPopup, closeOfferPopup: () => setOfferPopup(false),
  }}>{children}</Ctx.Provider>
}
