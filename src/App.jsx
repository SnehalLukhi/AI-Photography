import { Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { useEffect } from 'react'
import Header from './components/Header.jsx'
import Footer from './components/Footer.jsx'
import Home from './pages/Home.jsx'
import Explore from './pages/Explore.jsx'
import Generate from './pages/Generate.jsx'
import NotFound from './pages/NotFound.jsx'
import Creations from './pages/Creations.jsx'
import Pricing from './pages/Pricing.jsx'
import Coins from './pages/Coins.jsx'
import PaymentSuccess from './pages/PaymentSuccess.jsx'
import { Help, Contact, Feedback, Legal, Profile, Transactions } from './pages/Support.jsx'
import PrivacyPolicy from './pages/PrivacyPolicy.jsx'
import Login from './pages/Login.jsx'
import WelcomePopup from './components/WelcomePopup.jsx'
import PremiumPopup from './components/PremiumPopup.jsx'
import { useStudio } from './context/StudioContext.jsx'

export default function App() {
  const { pathname } = useLocation()
  const { signedIn, welcomeOffer, closeWelcomeOffer, premiumOffer, closePremiumOffer } = useStudio()
  const bare = pathname === '/login' // full-screen page without header/footer
  const generating = pathname === '/generate' // fixed-height page: no footer, no mobile chrome
  useEffect(() => { window.scrollTo(0, 0) }, [pathname])
  return (
    <div className="flex min-h-screen w-full flex-col overflow-x-clip bg-[#0F0433] selection:bg-[#B070FA]/30">
      {!bare && <Header generating={generating} />}
      <main className="flex-1 bg-page">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/explore" element={<Explore />} />
          <Route path="/generate" element={<Generate />} />
          <Route path="/studio" element={<Navigate to="/explore" replace />} />
          <Route path="/result" element={<Navigate to="/creations" replace />} />
          <Route path="/diy/*" element={<Navigate to="/explore" replace />} />
          <Route path="/creations" element={<Creations />} />
          <Route path="/pricing" element={<Pricing />} />
          <Route path="/coins" element={<Coins />} />
          <Route path="/payment-success" element={<PaymentSuccess />} />
          <Route path="/transactions" element={<Transactions />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/login" element={<Login />} />

          <Route path="/help" element={<Help />} />
          <Route path="/contact-us" element={<Contact />} />
          <Route path="/feedback" element={<Feedback />} />
          <Route path="/privacy-policy" element={<PrivacyPolicy />} />
          <Route path="/terms-conditions" element={<Legal kind="terms" />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </main>
      {!bare && !generating && <Footer />}
      {signedIn && welcomeOffer && !bare && <WelcomePopup onClose={closeWelcomeOffer} />}
      {signedIn && premiumOffer && !welcomeOffer && !bare && <PremiumPopup onClose={closePremiumOffer} />}
    </div>
  )
}
