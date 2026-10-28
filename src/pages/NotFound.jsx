import { Link } from 'react-router-dom'

export default function NotFound() {
  return (
    <div className="mx-auto w-full max-w-none px-5 pb-16 pt-16 text-[#FAFAFA] sm:px-8 sm:pt-24 lg:px-10">
      <p className="eyebrow">404</p>
      <h1 className="mt-3 text-[56px] leading-none sm:text-[96px]">Page not found</h1>
      <p className="mt-4 max-w-md text-[16px] leading-relaxed text-[#B4B0C0]">The page may have moved, or the link may be incorrect.</p>
      <div className="mt-8 flex flex-wrap gap-3">
        <Link to="/" className="btn-grad !px-6 !py-3 !text-[15px]">Back to home</Link>
        <Link to="/explore" className="btn-dark !px-6 !py-3 !text-[15px]">Browse looks</Link>
      </div>
    </div>
  )
}
