import { Link } from 'react-router-dom'
import { Logo } from './Header.jsx'
import { brandImages } from '../data/images.js'

const cols = {
  Explore: [['Looks', '/explore'], ['My Creations', '/creations'], ['Transactions', '/transactions']],
  Wallet: [['Plans', '/pricing'], ['Coin packs', '/coins']],
  Support: [['Help Center', '/help'], ['Contact Support', '/contact-support'], ['Share Your Feedback', '/feedback']],
  Legal: [['Terms of Use', '/terms-conditions'], ['Privacy Policy', '/privacy-policy']],
}

/** Slim footer of the content column (hidden on phones, where the bottom bar takes its place). */
export default function Footer() {
  return (
    <footer className="mt-16 border-t border-[#2C2529] max-md:hidden">
      <div className="mx-auto w-full max-w-none px-6 pb-8 pt-10 lg:px-10">
        <div className="grid gap-10 lg:grid-cols-[1.2fr_2.8fr]">
          <div className="flex flex-col items-start gap-4">
            <Logo size="lg" />
            <p className="max-w-xs text-[14px] leading-relaxed text-[#B4B0C0]">Pick a look, add one photo, and get it back styled. Your results are saved to your library.</p>
            <a href="#" onClick={(e) => e.preventDefault()} className="inline-block transition-opacity hover:opacity-90"><img src={brandImages.storeBadge} alt="Get it on Google Play" width="360" height="108" className="h-11 w-auto rounded-md object-contain" /></a>
          </div>
          <div className="grid grid-cols-2 gap-8 sm:grid-cols-4">
            {Object.entries(cols).map(([h, items]) => (
              <div key={h}>
                <h3 className="mb-4 font-plexmono text-[11px] font-medium uppercase tracking-[0.14em] text-[#B4B0C0]">{h}</h3>
                <ul className="flex flex-col gap-3 text-[14px]">
                  {items.map(([label, to]) => <li key={label}><Link to={to} className="text-[#B4B0C0] transition-colors hover:text-[#FAFAFA]">{label}</Link></li>)}
                </ul>
              </div>
            ))}
          </div>
        </div>
        <div className="mt-10 flex flex-col items-center justify-between gap-2 border-t border-[#2C2529] pt-5 text-[12px] text-[#B4B0C0] sm:flex-row">
          <p>© {new Date().getFullYear()} Pictrify. All rights reserved.</p>
          <p>Made for creators.</p>
        </div>
      </div>
    </footer>
  )
}
