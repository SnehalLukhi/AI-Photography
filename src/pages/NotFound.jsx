import { Link } from 'react-router-dom'

export default function NotFound() {
  return (
    <div className="relative mx-auto w-full max-w-[960px] px-4 pb-28 pt-[97px] md:pb-20 min-[1008px]:px-0">
      <div className="pointer-events-none absolute left-1/2 top-1/2 size-[900px] -translate-x-1/2 -translate-y-1/3 rounded-full bg-[radial-gradient(closest-side,rgba(176,112,250,0.08),transparent)]" />
      <header className="relative">
        <p className="text-[11px] font-bold uppercase tracking-wide text-[#B070FA]">System State</p>
        <h1 className="mt-2 text-4xl font-bold tracking-tight text-[#ffffff] sm:text-5xl">Page Not Found</h1>
        <p className="mt-2 text-base text-[#C4B5FD]">The page you are looking for does not exist or has moved.</p>
      </header>
      <div className="relative mx-auto mt-[71px] flex max-w-[575px] flex-col items-center rounded-xl border border-[#3A3552] bg-gradient-to-br from-[#2A1B52] to-[#1A284F] px-8 py-[54px] text-center shadow-2xl">
        <div className="flex size-20 items-center justify-center rounded-full border border-[#3A3552] bg-gradient-to-br from-[#2A1B52] to-[#1A284F]">
          <svg className="size-8 text-[#B070FA]" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24"><path d="M12 3L2 20h20L12 3zM12 10v5m0 3h.01" strokeLinecap="round" strokeLinejoin="round" /></svg>
        </div>
        <p className="grad-text mt-6 text-[88px] font-extrabold leading-none tracking-tight">404</p>
        <h2 className="mt-4 text-3xl font-bold tracking-tight text-[#ffffff]">Page not found</h2>
        <p className="mt-3 max-w-xs text-base leading-relaxed text-[#C4B5FD]">The page may have moved or the link may be incorrect.</p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <Link to="/" className="grad-bg inline-flex h-[52px] items-center justify-center rounded-xl px-8 text-base font-semibold text-white transition-opacity hover:opacity-90">Back to Home</Link>
          <Link to="/explore" className="inline-flex h-[54px] items-center justify-center rounded-xl border border-[#3A3552] bg-gradient-to-br from-[#2A1B52] to-[#1A284F] px-8 text-base font-semibold text-white transition-colors hover:bg-gradient-to-br hover:from-[#2A1B52] hover:to-[#1A284F]">Explore Templates</Link>
        </div>
      </div>
    </div>
  )
}
