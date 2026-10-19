import { useNavigate } from 'react-router-dom'
import PageHeader, { pageWrap } from '../components/PageHeader.jsx'
import TemplateCard from '../components/TemplateCard.jsx'
import { dances, generateUrl } from '../data/templates.js'

export default function Dance() {
  const nav = useNavigate()
  return (
    <div className={pageWrap}>
      <PageHeader pill="Discover AI styles" a="Dance" b="Videos" sub="Find the perfect video style and start creating in seconds." />
      <section className="mt-10 sm:mt-12 lg:mt-14">
        <div className="mt-5 grid grid-cols-2 gap-2 min-[480px]:grid-cols-3 sm:mt-6 sm:gap-2.5 md:grid-cols-4 md:gap-3 lg:grid-cols-5 xl:grid-cols-6">
          {dances.map((d) => <TemplateCard key={d.id} t={d} onSelect={(t) => nav(generateUrl(t))} />)}
        </div>
      </section>
    </div>
  )
}
