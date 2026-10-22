import { Link } from 'react-router-dom'
import { Logo, SparkIcon } from './Header.jsx'
import { features } from '../data/templates.js'
import { brandImages } from '../data/images.js'

const cols = {
  'Explore': [['Explore Templates', '/explore'], ['Transactions', '/transactions']],
  Company: [['Help Center', '/help'], ['Share Your Feedback', '/feedback'], ['Pricing & Plans', '/pricing'], ['My Creations', '/creations']],
  Legal: [['Terms of Use', '/terms-conditions'], ['Privacy Policy', '/privacy-policy']],
}
// White line icons in an outlined circle, one per feature (same order as `features` in data/templates.js).
const FEATURE_ICONS = [
  <path key="spark" d="M12 4l1.9 5.1L19 11l-5.1 1.9L12 18l-1.9-5.1L5 11l5.1-1.9z" fill="currentColor" />,
  <g key="gem"><path d="M12 4.5l7.5 7.5-7.5 7.5L4.5 12z" fill="currentColor" /><path d="M12 8.6l3.4 3.4-3.4 3.4L8.6 12z" fill="#141012" /></g>,
  <path key="down" d="M12 6v9m0 0l-4-4m4 4l4-4M7 19h10" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />,
  <path key="star" d="M12 4.2l2.4 5 5.4.7-4 3.8 1 5.4-4.8-2.6-4.8 2.6 1-5.4-4-3.8 5.4-.7z" fill="currentColor" />,
]
export function FeatureStrip({ className = '' }) {
  return (
    <div className={`rounded-2xl bg-[#1B1619] px-5 py-[19px] sm:px-6 ${className}`}>
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4 lg:gap-0">
        {features.map((f, i) => (
          <div key={f.title} className={`flex items-center gap-3.5 ${i > 0 ? 'lg:border-l lg:border-[#252124] lg:pl-6' : ''} ${i < 3 ? 'lg:pr-6' : ''}`}>
            <span className="grid size-10 shrink-0 place-items-center rounded-full border-[1.5px] border-white/90 text-white">
              <svg className="size-[22px]" viewBox="0 0 24 24" aria-hidden="true">{FEATURE_ICONS[i]}</svg>
            </span>
            <div className="min-w-0">
              <h4 className="text-sm font-normal leading-tight text-white">{f.title}</h4>
              <p className="mt-0.5 text-xs font-normal leading-snug text-[#8E898C]">{f.text}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export default function Footer() {
  return (
    <footer className="relative z-0 mt-10 max-md:hidden overflow-hidden border-t border-[#1B181A] bg-[#141012] pb-28 pt-0 text-white md:pb-4">
      <div className="w-full">
        <div className="relative w-full border-b border-[#2C282B] px-4 py-6 sm:px-8 sm:py-7 lg:px-12 xl:px-16">
          <div className="grid grid-cols-1 gap-6 border-b border-[#1F1B1D] pb-6 lg:grid-cols-12 lg:gap-6">
            <div className="flex flex-col justify-between gap-4 lg:col-span-3 lg:border-r lg:border-[#1F1B1D] lg:pr-6">
              <div className="space-y-2.5">
                <Logo size="lg" />
                <p className="max-w-sm text-sm font-normal leading-relaxed text-[#A0A0A0]">AI-powered photo creation platform. Turn your ideas into stunning visuals in seconds.</p>
                <div className="relative w-fit pt-1">
                  <div className="rounded-full bg-gradient-to-r from-[#FF88C7] to-[#FF55AA] p-[1.5px] shadow-[0_0_12px_rgba(255,85,170,0.3)]">
                    <div className="flex select-none items-center gap-2 rounded-full bg-[#141012] px-4 py-1.5 text-xs font-medium text-white">
                      <SparkIcon className="size-3.5 text-[#FF55AA]" /><span>AI-Powered</span>
                      <span className="bg-gradient-to-r from-[#FF88C7] to-[#FF55AA] bg-clip-text font-medium text-transparent">Creation</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div className="my-4 grid grid-cols-3 items-start gap-x-4 sm:gap-x-8 lg:col-span-6 lg:my-0 lg:gap-x-4 lg:px-4 xl:gap-x-6 xl:px-6 2xl:grid-cols-[repeat(3,minmax(0,273px))] 2xl:gap-x-0 2xl:pl-10 2xl:pr-0">
              {Object.entries(cols).map(([h, items]) => (
                <div key={h} className="min-w-0">
                  <h3 className="mb-3.5 font-sans text-sm font-semibold leading-5 text-[#ffffff]">{h}</h3>
                  <ul className="flex flex-col gap-2 text-xs leading-5 sm:text-sm">
                    {items.map(([label, to]) => (
                      <li key={label}>
                        <Link to={to} className="group flex cursor-pointer items-start text-[#A0A0A0] transition-colors hover:text-white">
                          <span className="mr-2.5 mt-[7px] inline-block size-1.5 shrink-0 rounded-full bg-gradient-to-r from-[#FF88C7] to-[#FF55AA] opacity-60 transition-all duration-300 group-hover:scale-125 group-hover:opacity-100 group-hover:shadow-[0_0_8px_rgba(255,85,170,0.8)]" />
                          <span className="min-w-0">{label}</span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
            <div className="relative mt-4 flex flex-col items-center justify-center overflow-visible pb-2 text-center lg:col-span-3 lg:mt-0 lg:border-l lg:border-[#1F1B1D] lg:pl-6">
              <div className="flex w-full flex-col items-center space-y-3">
                <p className="text-base font-semibold tracking-wide text-white sm:text-lg">Get Our App</p>
                <a href="#" onClick={(e) => e.preventDefault()} className="inline-block cursor-pointer pt-1 transition-transform duration-300 hover:scale-[1.04]">
                  <img src={brandImages.storeBadge} alt="Get it on Google Play" width="360" height="108" className="h-11 w-auto rounded-xl object-contain sm:h-12" />
                </a>
              </div>
            </div>
          </div>
          <FeatureStrip className="mt-5" />
          <div className="mt-5 flex flex-col items-center justify-between gap-3 border-t border-[#2C282B] pt-4 text-xs text-[#8E898C] sm:flex-row">
            <p>© {new Date().getFullYear()} Pictrify. All rights reserved.</p>
            <div className="flex items-center gap-1.5 text-xs font-normal"><span>Made with love for creators</span><span className="text-[#FF55AA]">💗</span></div>
          </div>
        </div>
      </div>
    </footer>
  )
}
