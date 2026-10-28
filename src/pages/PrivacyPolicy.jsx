import { useNavigate } from 'react-router-dom'
// Privacy Policy page. Layout follows the reference structure (title, effective date, numbered-style H2/H3 sections, bullet lists); the TEXT is written for Pictrify and only
// states what the app actually does today (demo sign-in kept in this browser, photos sent to the AI processing provider, no payments yet). It has not been reviewed by a
// lawyer: have it reviewed, and add a real contact e-mail address, before relying on it.
const P = (text) => ({ p: text })
const L = (...items) => ({ ul: items })

const sections = [
  ['Introduction', null, [
    P('Pictrify (“Pictrify,” “we,” “us,” or “our”) is an AI-powered platform for creating stylised photos from templates. This Privacy Policy explains how we collect, use, store, and protect information when you visit our website, sign in, upload a photo, or otherwise use Pictrify.'),
    P('By using Pictrify, you agree to the practices described in this Privacy Policy.'),
  ]],
  ['Information We Collect', [
    ['Account and Profile Information', [
      P('When you sign in, we may collect:'),
      L('Email address', 'Name or display name, if you provide one when you sign up', 'Sign-in session details (your email and when the session expires)'),
      P('Your sign-in session is kept in your own browser, and your password is never saved by the app.'),
    ]],
    ['Payment and Billing Information', [
      P('Paid plans and payments are not available in Pictrify yet, so we do not collect payment or billing information. If paid plans are added, payments will be handled by a third-party payment processor, and this policy will be updated before that happens.'),
    ]],
    ['Content You Provide', [
      P('To generate AI results, you may upload or submit:'),
      L('Photos and images', 'The template and style you choose', 'Feedback and support messages, and any image you attach to them'),
      P('Uploaded content is used only to provide your generation and to respond to your requests.'),
    ]],
    ['Automatically Collected Information', [
      P('We may automatically collect:'),
      L('IP address (used, for example, to limit repeated requests)', 'Browser type, device type, and operating system', 'Pages visited and usage timestamps', 'Local storage data kept by the app in your browser', 'Error logs and performance diagnostics'),
    ]],
    ['Information From Third Parties', [
      P('We may receive limited technical information from the service that processes your photos, such as a task identifier and the result of your request.'),
    ]],
  ], null],
  ['How We Use Your Information', null, [
    P('We use the information we collect to:'),
    L('Provide, maintain, and improve Pictrify', 'Process your photo and return the generated image', 'Keep you signed in and remember your preferences', 'Respond to support requests and feedback', 'Detect, prevent, and address abuse, fraud, and technical problems', 'Comply with legal obligations'),
  ]],
  ['AI Generation and Uploaded Media', null, [
    P('When you generate an image, your photo is sent from the app to our server and then to a third-party AI processing provider (AILabTools) so that it can create the result. The generated image is shown to you in the app.'),
    P('Please upload only photos that you have the right to use, and do not upload photos of other people without their permission. Do not upload unlawful, abusive, or sexually explicit content, or images of minors.'),
  ]],
  ['Cookies and Similar Technologies', null, [
    P('Pictrify keeps small pieces of data in your browser’s local storage, for example to remember that you are signed in and whether you have already seen the welcome message. You can clear this data at any time in your browser settings; doing so will sign you out.'),
  ]],
  ['How We Share Information', null, [
    P('We do not sell your personal information. We may share information only:'),
    L('With the AI processing provider, to generate your images', 'With service providers that help us run Pictrify, under appropriate confidentiality obligations', 'When required by law, or to protect the rights, safety, and security of Pictrify and our users', 'In connection with a business transfer such as a merger or acquisition'),
  ]],
  ['Data Retention', null, [
    P('Your uploaded photo is used to create your result and is not kept on our server after it has been processed. Generated images are made available through a link that the processing provider keeps for a limited time (currently about 24 hours). Your sign-in session in the browser lasts for up to 30 days unless the browser data is cleared.'),
    P('We keep other information, such as support messages and feedback, only for as long as needed for the purposes described in this policy or as required by law.'),
  ]],
  ['Data Security', null, [
    P('We use reasonable technical and organisational measures to protect your information, including limiting how long uploaded files are kept on our server. However, no method of transmission or storage is completely secure, and we cannot guarantee absolute security.'),
  ]],
  ['Your Privacy Rights', null, [
    P('Depending on where you live, you may have the right to:'),
    L('Access the personal information we hold about you', 'Correct inaccurate information', 'Request deletion of your information', 'Object to or restrict certain processing', 'Withdraw consent where processing is based on consent'),
    P('To make a request, please contact us using the details below.'),
  ]],
  ['Children’s Privacy', null, [
    P('Pictrify is not intended for children under 13 (or the minimum age required in your country), and we do not knowingly collect personal information from them. If you believe a child has provided us with information, please contact us so that we can remove it.'),
  ]],
  ['International Users', null, [
    P('Your information may be processed in countries other than your own, including by our AI processing provider. By using Pictrify, you understand that your information may be transferred to and processed in these locations.'),
  ]],
  ['Third-Party Links', null, [
    P('Pictrify may link to websites or services that we do not operate. We are not responsible for their privacy practices, and we encourage you to read their policies.'),
  ]],
  ['Changes to This Privacy Policy', null, [
    P('We may update this Privacy Policy from time to time. When we do, we will change the effective date at the top of this page. Your continued use of Pictrify after a change means you accept the updated policy.'),
  ]],
  ['Contact Us', null, [
    P('If you have questions about this Privacy Policy or want to make a privacy request, please reach out through the Contact Support page in the app.'),
  ]],
]

const Block = ({ b }) => (b.p
  ? <p className="mb-4 text-[15px] leading-[1.65] text-[#B4B0C0]">{b.p}</p>
  : <ul className="mb-5 list-disc space-y-1.5 pl-6 text-[15px] leading-[1.6] text-[#B4B0C0] marker:text-[#B4B0C0]">{b.ul.map((i) => <li key={i}>{i}</li>)}</ul>)

export default function PrivacyPolicy() {
  const nav = useNavigate()
  return (
    <div className="px-5 pb-8 pt-8 sm:px-8 sm:pt-10 lg:px-10">
      <button type="button" onClick={() => nav(-1)} className="mb-3 inline-flex cursor-pointer items-center gap-1.5 text-[13px] text-[#B4B0C0] hover:text-[#FAFAFA] md:hidden"><svg className="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M15 6l-6 6 6 6" /></svg>Back</button>
      <article className="mx-auto max-w-3xl">
        <p className="eyebrow">Legal</p>
        <h1 className="gradient-text mt-3 w-fit text-[40px] leading-[1.05] sm:text-[56px]">Privacy Policy</h1>
        <p className="mb-2 mt-5 text-[15px] text-[#B4B0C0]"><strong className="font-semibold text-[#FAFAFA]">Effective Date:</strong> 21 October 2026</p>
        {sections.map(([h, subs, blocks]) => (
          <section key={h}>
            <h2 className="mb-3 mt-10 text-[26px] leading-tight">{h}</h2>
            {blocks && blocks.map((b, i) => <Block key={i} b={b} />)}
            {subs && subs.map(([sh, sb]) => (
              <div key={sh}>
                <h3 className="mb-3 mt-7 text-[17px] font-semibold">{sh}</h3>
                {sb.map((b, i) => <Block key={i} b={b} />)}
              </div>
            ))}
          </section>
        ))}
      </article>
    </div>
  )
}
