/** Page intro shared by Explore / Dance / Creations / Pricing: small eyebrow, big bold title, subtitle, optional right-hand slot. */
export default function PageHeader({ pill, a, b, sub, right }) {
  return (
    <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        <div className="eyebrow"><span>{pill}</span></div>
        <h1 className="mt-3 text-[38px] font-bold leading-[1.05] tracking-tight text-[#FFFFFF] min-[420px]:text-[42px] sm:text-[54px] lg:text-[64px]">
          <span>{a}</span>{' '}<span className="grad-text">{b}</span>
        </h1>
        {sub && <p className="mt-4 max-w-[600px] text-base leading-relaxed text-[#A1A1AA] sm:text-lg">{sub}</p>}
      </div>
      {right}
    </div>
  )
}

export const pageWrap = 'mx-auto w-full max-w-none px-4 pb-24 pt-8 min-[375px]:px-5 sm:px-6 md:px-6 md:pb-8 lg:px-8 xl:pb-10 xl:pt-10'
export const gridCls = 'mt-5 grid grid-cols-2 gap-4 min-[480px]:grid-cols-3 sm:mt-8 sm:gap-5 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6'
