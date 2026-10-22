import { Link } from 'react-router-dom'
import { Logo, SparkIcon } from './Header.jsx'
import { features } from '../data/templates.js'
import { brandImages } from '../data/images.js'

const cols = {
  'Explore': [['Explore Templates', '/explore'], ['Transactions', '/transactions']],
  Company: [['Help Center', '/help'], ['Share Your Feedback', '/feedback'], ['Pricing & Plans', '/pricing'], ['My Creations', '/creations']],
  Legal: [['Terms of Use', '/terms-conditions'], ['Privacy Policy', '/privacy-policy']],
}
export function FeatureStrip({ className = '' }) {
  return (
    <div className={`rounded-xl border border-[#2B2B2B] bg-[#0A0809] p-4 shadow-xl sm:p-5 ${className}`}>
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {features.map((f, i) => (
          <div key={f.title} className={`flex items-center gap-3.5 ${i < 3 ? 'lg:border-r lg:border-[#2B2B2B] lg:pr-4' : ''}`}>
            <div className="flex size-11 shrink-0 items-center justify-center"><img src={f.image} alt={f.title} className="size-11 object-contain" /></div>
            <div>
              <h4 className="text-sm font-normal leading-tight text-[#ffffff]">{f.title}</h4>
              <p className="mt-0.5 text-xs font-normal text-[#A0A0A0]">{f.text}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export default function Footer() {
  return (
    <footer className="relative z-0 mt-10 max-md:hidden overflow-hidden border-t border-[#2B2B2B] bg-[#0A0809] pb-28 pt-0 text-white md:pb-4">
      <div className="pointer-events-none absolute left-1/2 top-0 -z-10 h-[350px] w-full max-w-[1200px] -translate-x-1/2 bg-gradient-to-b from-[#FF55AA]/10 via-[#FF55AA]/5 to-transparent opacity-70 blur-3xl" />
      <div className="w-full">
        <div className="relative w-full border-b border-[#2B2B2B] bg-[#0A0809] px-4 py-6 shadow-[0_10px_50px_rgba(0,0,0,0.8)] backdrop-blur-xl sm:px-8 sm:py-7 lg:px-12 xl:px-16">
          <div className="grid grid-cols-1 gap-6 border-b border-[#2B2B2B] pb-6 lg:grid-cols-12 lg:gap-6">
            <div className="flex flex-col justify-between gap-4 lg:col-span-3 lg:border-r lg:border-[#2B2B2B] lg:pr-6">
              <div className="space-y-2.5">
                <Logo size="lg" />
                <p className="max-w-sm text-sm font-normal leading-relaxed text-[#A0A0A0]">AI-powered photo &amp; video creation platform. Turn your ideas into stunning visuals in seconds.</p>
                <div className="relative w-fit pt-1">
                  <div className="rounded-full bg-gradient-to-r from-[#FF88C7] to-[#FF55AA] p-[1.5px] shadow-[0_0_12px_rgba(255,85,170,0.3)]">
                    <div className="flex select-none items-center gap-2 rounded-full bg-[#0A0809] px-4 py-1.5 text-xs font-medium text-white">
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
            <div className="relative mt-4 flex flex-col items-center justify-center overflow-visible pb-2 text-center lg:col-span-3 lg:mt-0 lg:border-l lg:border-[#2B2B2B] lg:pl-6">
              <div className="flex w-full flex-col items-center space-y-3">
                <p className="text-base font-semibold tracking-wide text-white sm:text-lg">Get Our App</p>
                <a href="#" onClick={(e) => e.preventDefault()} className="inline-block cursor-pointer pt-1 transition-transform duration-300 hover:scale-[1.04]">
                  <img src={brandImages.storeBadge} alt="Get it on Google Play" width="360" height="108" className="h-11 w-auto rounded-xl object-contain sm:h-12" />
                </a>
              </div>
            </div>
          </div>
          <FeatureStrip className="mt-5" />
          <div className="mt-5 flex flex-col items-center justify-between gap-3 border-t border-[#2B2B2B] pt-4 text-xs text-[#A0A0A0] sm:flex-row">
            <p>© {new Date().getFullYear()} Pictrify. All rights reserved.</p>
            <div className="flex items-center gap-1.5 text-xs font-normal"><span>Made with love for creators</span><span className="text-[#FF55AA]">💗</span></div>
          </div>
        </div>
      </div>
    </footer>
  )
}
