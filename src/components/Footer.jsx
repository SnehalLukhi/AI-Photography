import { Link } from 'react-router-dom'
import { Logo, SparkIcon } from './Header.jsx'
import { features } from '../data/templates.js'
import { brandImages } from '../data/images.js'

const cols = {
  'Explore': [['Explore Templates', '/explore'], ['Transactions', '/transactions']],
  Company: [['Help Center', '/help'], ['Share Your Feedback', '/feedback'], ['Pricing & Plans', '/pricing'], ['My Creations', '/creations']],
  Legal: [['Terms of Use', '/terms-conditions'], ['Privacy Policy', '/privacy-policy']],
}
const social = [
  ['Instagram', 'hover:border-[#B070FA] hover:bg-[#B070FA]/20 hover:shadow-[0_0_15px_rgba(176,112,250,0.5)]', 'M7.0301.084c-1.2768.0602-2.1487.264-2.911.5634-.7888.3075-1.4575.72-2.1228 1.3877-.6652.6677-1.075 1.3368-1.3802 2.127-.2954.7638-.4956 1.6365-.552 2.914-.0564 1.2775-.0689 1.6882-.0626 4.947.0062 3.2586.0206 3.6671.0825 4.9473.061 1.2765.264 2.1482.5635 2.9107.308.7889.72 1.4573 1.388 2.1228.6679.6655 1.3365 1.0743 2.1285 1.38.7632.295 1.6361.4961 2.9134.552 1.2773.056 1.6884.069 4.9462.0627 3.2578-.0062 3.668-.0207 4.9478-.0814 1.28-.0607 2.147-.2652 2.9098-.5633.7889-.3086 1.4578-.72 2.1228-1.3881.665-.6682 1.0745-1.3378 1.3795-2.1284.2957-.7632.4966-1.636.552-2.9124.056-1.2809.0692-1.6898.063-4.948-.0063-3.2583-.021-3.6668-.0817-4.9465-.0607-1.2797-.264-2.1487-.5633-2.9117-.3084-.7889-.72-1.4568-1.3876-2.1228C21.2982 1.33 20.628.9208 19.8378.6165 19.074.321 18.2017.1197 16.9244.0645 15.6471.0093 15.236-.005 11.977.0014 8.718.0076 8.31.0215 7.0301.0839m.1402 21.6932c-1.17-.0509-1.8053-.2453-2.2287-.408-.5606-.216-.96-.4771-1.3819-.895-.422-.4178-.6811-.8186-.9-1.378-.1644-.4234-.3624-1.058-.4171-2.228-.0595-1.2645-.072-1.6442-.079-4.848-.007-3.2037.0053-3.583.0607-4.848.05-1.169.2456-1.805.408-2.2282.216-.5613.4762-.96.895-1.3816.4188-.4217.8184-.6814 1.3783-.9003.423-.1651 1.0575-.3614 2.227-.4171 1.2655-.06 1.6447-.072 4.848-.079 3.2033-.007 3.5835.005 4.8495.0608 1.169.0508 1.8053.2445 2.228.408.5608.216.96.4754 1.3816.895.4217.4194.6816.8176.9005 1.3787.1653.4217.3617 1.056.4169 2.2263.0602 1.2655.0739 1.645.0796 4.848.0058 3.203-.0055 3.5834-.061 4.848-.051 1.17-.245 1.8055-.408 2.2294-.216.5604-.4763.96-.8954 1.3814-.419.4215-.8181.6811-1.3783.9-.4224.1649-1.0577.3617-2.2262.4174-1.2656.0595-1.6448.072-4.8493.079-3.2045.007-3.5825-.006-4.848-.0608M16.953 5.5864A1.44 1.44 0 1 0 18.39 4.144a1.44 1.44 0 0 0-1.437 1.4424M5.8385 12.012c.0067 3.4032 2.7706 6.1557 6.173 6.1493 3.4026-.0065 6.157-2.7701 6.1506-6.1733-.0065-3.4032-2.771-6.1565-6.174-6.1498-3.403.0067-6.156 2.771-6.1496 6.1738M8 12.0077a4 4 0 1 1 4.008 3.9921A3.9996 3.9996 0 0 1 8 12.0077'],
  ['YouTube', 'hover:border-red-500 hover:bg-red-500/20 hover:shadow-[0_0_15px_rgba(239,68,68,0.5)]', 'M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z'],
  ['Facebook', 'hover:border-[#B070FA] hover:bg-[#B070FA]/20 hover:shadow-[0_0_15px_rgba(176,112,250,0.5)]', 'M9.101 23.691v-7.98H6.627v-3.667h2.474v-1.58c0-4.085 1.848-5.978 5.858-5.978.401 0 .955.042 1.468.103a8.68 8.68 0 0 1 1.141.195v3.325a8.623 8.623 0 0 0-.653-.036 26.805 26.805 0 0 0-.733-.009c-.707 0-1.259.096-1.675.309a1.686 1.686 0 0 0-.679.622c-.258.42-.374.995-.374 1.752v1.297h3.919l-.386 2.103-.287 1.564h-3.246v8.245C19.396 23.238 24 18.179 24 12.044c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.628 3.874 10.35 9.101 11.647Z'],
  ['X', 'hover:border-[#B070FA]/60 hover:bg-white/10 hover:shadow-[0_0_15px_rgba(255,255,255,0.3)]', 'M18.901 1.153h3.68l-8.04 9.19L24 22.846h-7.406l-5.8-7.584-6.638 7.584H.474l8.6-9.83L0 1.154h7.594l5.243 6.932ZM17.61 20.644h2.039L6.486 3.24H4.298Z'],
]

export function FeatureStrip({ className = '' }) {
  return (
    <div className={`rounded-xl border border-[#262631] bg-[#000000] p-4 shadow-xl sm:p-5 ${className}`}>
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {features.map((f, i) => (
          <div key={f.title} className={`flex items-center gap-3.5 ${i < 3 ? 'lg:border-r lg:border-[#262631] lg:pr-4' : ''}`}>
            <div className="flex size-11 shrink-0 items-center justify-center"><img src={f.image} alt={f.title} className="gold-img size-11 object-contain" style={{ filter: `hue-rotate(${[263, 315, 28, 263][i]}deg) saturate(0.95)` }} /></div>
            <div>
              <h4 className="text-sm font-normal leading-tight text-[#ffffff]">{f.title}</h4>
              <p className="mt-0.5 text-xs font-normal text-[#8C8C9A]">{f.text}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export default function Footer() {
  return (
    <footer className="relative z-0 mt-10 overflow-hidden border-t border-[#241a3d] bg-[#000000] pb-28 pt-0 text-white md:pb-4">
      <div className="pointer-events-none absolute left-1/2 top-0 -z-10 h-[350px] w-full max-w-[1200px] -translate-x-1/2 bg-gradient-to-b from-[#B070FA]/10 via-[#B070FA]/5 to-transparent opacity-70 blur-3xl" />
      <div className="w-full">
        <div className="relative w-full border-b border-[#241a3d] bg-[#000000]/95 px-4 py-6 shadow-[0_10px_50px_rgba(0,0,0,0.8)] backdrop-blur-xl sm:px-8 sm:py-7 lg:px-12 xl:px-16">
          <div className="grid grid-cols-1 gap-6 border-b border-[#262631] pb-6 lg:grid-cols-12 lg:gap-6">
            <div className="flex flex-col justify-between gap-4 lg:col-span-3 lg:border-r lg:border-[#262631] lg:pr-6">
              <div className="space-y-2.5">
                <Logo size="lg" />
                <p className="max-w-sm text-sm font-normal leading-relaxed text-[#A9A9B8]">AI-powered photo &amp; video creation platform. Turn your ideas into stunning visuals in seconds.</p>
                <div className="relative w-fit pt-1">
                  <div className="rounded-full bg-gradient-to-r from-[#B070FA] to-[#F066D8] p-[1.5px] shadow-[0_0_12px_rgba(176,112,250,0.3)]">
                    <div className="flex select-none items-center gap-2 rounded-full bg-[#000000] px-4 py-1.5 text-xs font-medium text-white">
                      <SparkIcon className="size-3.5 text-[#B070FA]" /><span>AI-Powered</span>
                      <span className="bg-gradient-to-r from-[#B070FA] to-[#F066D8] bg-clip-text font-medium text-transparent">Creation</span>
                    </div>
                  </div>
                </div>
              </div>
              <div className="pt-2">
                <p className="mb-3 text-sm font-medium text-white">Follow Us</p>
                <div className="flex flex-wrap items-center gap-3">
                  {social.map(([name, hover, d]) => (
                    <a key={name} href="#" onClick={(e) => e.preventDefault()} aria-label={name} className={`group flex size-10 cursor-pointer items-center justify-center rounded-full border border-[#262631] bg-[#16161c] text-white/90 transition-all duration-300 hover:scale-110 hover:text-white ${hover}`}>
                      <svg className="size-5 shrink-0 fill-current" viewBox="0 0 24 24" aria-hidden="true"><path d={d} /></svg>
                    </a>
                  ))}
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
                        <Link to={to} className="group flex cursor-pointer items-start text-[#A9A9B8] transition-colors hover:text-white">
                          <span className="mr-2.5 mt-[7px] inline-block size-1.5 shrink-0 rounded-full bg-gradient-to-r from-[#B070FA] to-[#F066D8] opacity-60 transition-all duration-300 group-hover:scale-125 group-hover:opacity-100 group-hover:shadow-[0_0_8px_rgba(176,112,250,0.8)]" />
                          <span className="min-w-0">{label}</span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
            <div className="relative mt-4 flex flex-col items-center justify-center overflow-visible pb-2 text-center lg:col-span-3 lg:mt-0 lg:border-l lg:border-[#262631] lg:pl-6">
              <div className="flex w-full flex-col items-center space-y-3">
                <p className="text-base font-semibold tracking-wide text-white sm:text-lg">Get Our App</p>
                <a href="#" onClick={(e) => e.preventDefault()} className="inline-block cursor-pointer pt-1 transition-transform duration-300 hover:scale-[1.04]">
                  <img src={brandImages.storeBadge} alt="Get it on Google Play" width="360" height="108" className="h-11 w-auto rounded-xl object-contain sm:h-12" />
                </a>
              </div>
            </div>
          </div>
          <FeatureStrip className="mt-5" />
          <div className="mt-5 flex flex-col items-center justify-between gap-3 border-t border-[#262631] pt-4 text-xs text-[#8C8C9A] sm:flex-row">
            <p>© {new Date().getFullYear()} Pixora. All rights reserved.</p>
            <div className="flex items-center gap-1.5 text-xs font-normal"><span>Made with love for creators</span><span className="text-[#B070FA]">💜</span></div>
          </div>
        </div>
      </div>
    </footer>
  )
}
