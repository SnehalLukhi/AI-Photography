/** Page intro shared by Explore / Dance / Creations / Pricing: mono eyebrow, giant condensed title, subtitle, optional right-hand slot. */
export default function PageHeader({ pill, a, b, sub, right }) {
  return (
    <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        <div className="eyebrow"><span>{pill}</span></div>
        <h1 className="mt-3 text-[36px] leading-[1.1] text-[#f8f5ff] min-[420px]:text-[42px] sm:text-[52px] lg:text-[60px]">
          <span>{a}</span>{' '}<span className="grad-text">{b}</span>
        </h1>
        {sub && <p className="mt-5 max-w-[640px] text-base leading-relaxed text-[#b8b4c7] sm:text-lg lg:text-xl">{sub}</p>}
      </div>
      {right}
    </div>
  )
}

export const pageWrap = 'mx-auto w-full max-w-none px-4 pb-24 pt-8 min-[375px]:px-5 sm:px-6 md:px-6 md:pb-8 lg:px-8 xl:pb-10 xl:pt-10'
export const gridCls = 'mt-5 grid grid-cols-2 gap-2 min-[480px]:grid-cols-3 sm:mt-6 sm:gap-2.5 md:grid-cols-4 md:gap-3 lg:grid-cols-5 xl:grid-cols-6'
