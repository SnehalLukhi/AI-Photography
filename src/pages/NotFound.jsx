import { Link } from 'react-router-dom'

export default function NotFound() {
  return (
    <div className="mx-auto w-full max-w-[1100px] px-5 pb-20 pt-10 sm:px-8 sm:pt-16 lg:px-10">
      <div className="relative flex flex-col items-center overflow-hidden rounded-3xl bg-[#1B1530] px-6 py-16 text-center text-[#FFFFFF] sm:py-24">
        <span className="pointer-events-none absolute -left-10 top-10 size-40 rounded-full bg-[#271425]" aria-hidden="true" />
        <span className="pointer-events-none absolute -right-12 bottom-6 size-52 rounded-full bg-[#101D2C]" aria-hidden="true" />
        <span className="pointer-events-none absolute left-[14%] bottom-12 size-8 rounded-full bg-[#262310]" aria-hidden="true" />
        <span className="pointer-events-none absolute right-[16%] top-12 size-5 rounded-full bg-[#102419]" aria-hidden="true" />
        <p className="relative flex items-center gap-1 text-[110px] font-extrabold leading-none tracking-tight sm:text-[190px]">
          <span>4</span>
          <span className="grid size-[88px] -rotate-6 place-items-center rounded-full bg-[linear-gradient(135deg,#705CFF_0%,#FC48E7_100%)] text-[44px] text-white shadow-[0_18px_40px_rgba(0,0,0,0.14)] sm:size-[150px] sm:text-[76px]" aria-hidden="true">?</span>
          <span>4</span>
        </p>
        <h1 className="relative mt-6 text-[30px] font-extrabold leading-tight tracking-tight sm:text-[46px]">Oops, this page wandered off</h1>
        <p className="relative mt-4 max-w-md text-[16px] leading-relaxed text-[#A1A1AA]">The page may have moved, or the link may be incorrect.</p>
        <div className="relative mt-8 flex flex-wrap justify-center gap-3">
          <Link to="/" className="btn-primary !rounded-full !px-7 !py-3 !text-[15px]">Back to home</Link>
          <Link to="/explore" className="btn-dark !rounded-full !px-7 !py-3 !text-[15px]">Browse looks</Link>
        </div>
      </div>
    </div>
  )
}
