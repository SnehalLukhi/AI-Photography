import { Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { useEffect } from 'react'
import Header from './components/Header.jsx'
import Footer from './components/Footer.jsx'
import Home from './pages/Home.jsx'
import Explore from './pages/Explore.jsx'
import Generate from './pages/Generate.jsx'
import Video from './pages/Video.jsx'
import NotFound from './pages/NotFound.jsx'
import Creations from './pages/Creations.jsx'
import Wallet from './pages/Wallet.jsx'
import PaymentSuccess from './pages/PaymentSuccess.jsx'
import { Help, Contact, Feedback, Legal, Profile } from './pages/Support.jsx'
import PrivacyPolicy from './pages/PrivacyPolicy.jsx'
import LoginModal from './components/LoginModal.jsx'
import WelcomePopup from './components/WelcomePopup.jsx'
import PremiumPopup from './components/PremiumPopup.jsx'
import OfferPopup from './components/OfferPopup.jsx'
import { useStudio } from './context/StudioContext.jsx'

export default function App() {
  const { pathname } = useLocation()
  const { signedIn, loginOpen, welcomeOffer, closeWelcomeOffer, premiumOffer, closePremiumOffer, offerPopup, closeOfferPopup } = useStudio()
  const dashboard = signedIn && pathname === '/' // the signed-in home (components/MemberHome.jsx) keeps its footer-less layout
  const generating = pathname === '/generate' // the Create workspace: collapsed rail, no footer, no phone chrome
  useEffect(() => { window.scrollTo(0, 0) }, [pathname])
  return (
    <div className="min-h-screen w-full overflow-x-clip bg-[#08080D] text-white selection:bg-[#8B5CF6]/40">
      <Header generating={generating} />
      <div className="flex min-h-screen min-w-0 flex-col">
        <main className="flex-1">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/explore" element={<Explore />} />
            <Route path="/generate" element={<Generate />} />
            <Route path="/video" element={<Video />} />
            <Route path="/studio" element={<Navigate to="/explore" replace />} />
            <Route path="/result" element={<Navigate to="/creations" replace />} />
            <Route path="/diy/*" element={<Navigate to="/explore" replace />} />
            <Route path="/creations" element={<Creations />} />
            <Route path="/pricing" element={<Wallet tab="plans" />} />
            <Route path="/coins" element={<Wallet tab="packs" />} />
            <Route path="/payment-success" element={<PaymentSuccess />} />
            <Route path="/transactions" element={<Wallet tab="history" />} />
            <Route path="/profile" element={<Profile />} />

            <Route path="/help" element={<Help />} />
            <Route path="/contact-us" element={<Contact />} />
            <Route path="/contact-support" element={<Contact />} />
            <Route path="/feedback" element={<Feedback />} />
            <Route path="/privacy-policy" element={<PrivacyPolicy />} />
            <Route path="/terms-conditions" element={<Legal kind="terms" />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </main>
        {!generating && !dashboard && <div className="max-md:hidden"><Footer /></div>}
        {!generating && <div className="h-20 md:hidden" aria-hidden="true" />} {/* phones: room for the fixed bottom bar */}
      </div>
      {loginOpen && !signedIn && <LoginModal />}
      {signedIn && welcomeOffer && <WelcomePopup onClose={closeWelcomeOffer} />}
      {signedIn && premiumOffer && !welcomeOffer && <PremiumPopup onClose={closePremiumOffer} />}
      {signedIn && offerPopup && !welcomeOffer && !premiumOffer && <OfferPopup onClose={closeOfferPopup} />}
    </div>
  )
}
