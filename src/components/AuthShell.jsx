import { Link } from 'react-router-dom'
import { brandImages } from '../data/images.js'

/** Full-screen page for the account pages (forgot / reset password): same dark look and card as the Login page, without header and footer. */
export default function AuthShell({ title, subtitle, children }) {
  return (
    <div className="login-fade fixed inset-0 z-[200] flex overflow-y-auto bg-[#000000] text-white">
      <main className="flex min-w-0 flex-1 flex-col px-5 sm:px-8">
        <header className="flex items-center justify-between py-6">
          <Link to="/" className="flex items-center gap-2.5"><img src={brandImages.logo} alt="" className="size-8 rounded-xl" /><span className="text-lg font-semibold tracking-tight">Pixora</span></Link>
          <Link to="/login" className="text-sm text-[#C4B5FD]/75 transition-colors duration-200 hover:text-white">Back to login</Link>
        </header>
        <div className="m-auto w-full max-w-[440px] py-8">
          <div className="login-rise rounded-xl border border-[#3A3552] bg-gradient-to-br from-[#2A1B52] to-[#1A284F] p-6 shadow-[0_20px_60px_rgba(0,0,0,0.35)] sm:p-8">
            <h1 className="text-[26px] font-bold tracking-tight">{title}</h1>
            {subtitle && <p className="mb-7 mt-2 text-sm leading-relaxed text-[#C4B5FD]/75">{subtitle}</p>}
            {children}
          </div>
        </div>
      </main>
    </div>
  )
}
