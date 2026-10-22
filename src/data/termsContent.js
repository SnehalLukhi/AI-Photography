// Terms and Conditions page text, copied from "Terms and Conditions.pdf" (headings, numbering, paragraphs, bullets and date kept as written); the site name is written as Pictrify. The email address and website address are kept as in the PDF.
// Block types: a plain string = paragraph; { ul: [...] } = bullet list (an item is a string or { b: 'Bold label:', t: 'text' });
// { kv: ['Email:', 'support@pictrify.com'] } = bold label + value (a value can carry a link: { kv: ['Website:', 'https://pictrify.com', 'https://pictrify.com'] }).
export const termsTitle = 'Terms and Conditions'
export const termsDate = '21 October 2026'

export const termsSections = [
  ['1. Acceptance of Terms', [
    `Welcome to Pictrify. These Terms and Conditions (“Terms”) govern your access to and use of the Pictrify website, applications, AI photo generation tools, templates, coin system, subscriptions, and related services (collectively, the “Services”).`,
    `By creating an account, purchasing coins or plans, uploading content, or using Pictrify, you agree to these Terms. If you do not agree, please do not use the Services.`,
  ]],
  ['2. About Pictrify', [
    `Pictrify is an AI-powered photo creativity platform that allows users to transform their photos and create personalized images using artificial intelligence.`,
    `Our features may include:`,
    { ul: [
      { b: 'AI Hairstyle and Hair Color:', t: ' Preview different hairstyles and hair colors using your photos.' },
      { b: 'AI Cartoon Effects:', t: ' Transform photos into cartoon-style and illustrated images.' },
      { b: 'AI Photography Templates:', t: ' Create stylized photos using trending templates and creative effects.' },
      { b: 'AI Face Beauty:', t: ' Enhance facial appearance with AI-powered beauty effects and photo improvements.' },
      { b: 'Other AI Photo Features:', t: ' Additional photo editing and generation features that may become available on the platform.' },
    ] },
    `Features, AI models, templates, coin costs, pricing, and availability may change over time.`,
  ]],
  ['3. Eligibility and Accounts', [
    { ul: [
      `You must be at least 13 years old, or the minimum legal age required in your jurisdiction, to use Pictrify.`,
      `You must provide accurate registration information and keep it updated.`,
      `You are responsible for activities performed through your account.`,
      `You must keep your login credentials secure and notify us promptly of unauthorized account access.`,
      `We may suspend or terminate accounts that violate these Terms or present security, fraud, or abuse risks.`,
    ] },
  ]],
  ['4. Coins, Packs, and Subscriptions', [
    `Pictrify may use a coin-based system for AI photo generations and other features.`,
    { ul: [
      `Different features, templates, AI models, and image processing operations may require different numbers of coins.`,
      `Your available coin balance will be displayed in your account when the feature is supported.`,
      `Coins may be purchased through one-time coin packs, promotional offers, or subscription plans available on the Pricing page.`,
      `Subscription benefits, billing periods, and included coins depend on the selected plan.`,
      `Paid subscriptions may renew automatically unless cancelled according to the applicable subscription and payment-provider rules.`,
      `Payments may be processed through third-party providers such as Razorpay or Stripe, depending on the payment method available.`,
      `Prices may be displayed in supported currencies and may vary by region or payment method.`,
      `Promotional coins and subscription benefits may expire according to the terms of the applicable offer.`,
    ] },
    `Please review the applicable pricing and plan details before making a purchase.`,
  ]],
  ['5. AI Generations and Service Limitations', [
    { ul: [
      `AI-generated photos may vary in quality, appearance, style, accuracy, and similarity to the original person.`,
      `Results depend on factors such as photo quality, lighting, facial visibility, selected templates, and AI model capabilities.`,
      `Generation times may vary depending on demand, processing requirements, network conditions, and system availability.`,
      `Completed generations may be available in your account or My Creations section, where supported.`,
      `Pictrify does not guarantee that every generation will succeed or produce the expected result.`,
      `Failed, delayed, or unexpected outputs may occur because of technical issues, model limitations, invalid inputs, or system load.`,
      `We do not guarantee uninterrupted access to the Services and may update, modify, or discontinue features when necessary.`,
    ] },
  ]],
  ['6. User Content and Photo Uploads', [
    `You may upload photos, prompts, and other supported content (“User Content”) to use Pictrify's features.`,
    `You represent and warrant that:`,
    { ul: [
      `You own the uploaded content or have the necessary permissions to use it.`,
      `Your uploads do not unlawfully infringe another person's privacy, publicity, intellectual-property, or other legal rights.`,
      `You will not upload content that is unlawful, exploitative, abusive, or otherwise prohibited by these Terms.`,
      `You have obtained any required consent from individuals whose photos you upload.`,
    ] },
    `You grant Pictrify a limited, non-exclusive license to host, process, transmit, and display your User Content only as reasonably necessary to operate the Services, generate requested outputs, provide support, and maintain safety and reliability.`,
    `Your uploaded photos and generated content will be handled in accordance with our Privacy Policy.`,
  ]],
  ['7. Acceptable Use', [
    `You agree not to:`,
    { ul: [
      `Use Pictrify for unlawful, deceptive, fraudulent, or harmful purposes.`,
      `Upload or generate sexual, exploitative, or abusive content involving minors.`,
      `Create or distribute non-consensual intimate imagery or deceptive impersonations that violate applicable laws or the rights of others.`,
      `Upload photos or content without the required rights or consent.`,
      `Use AI-generated images to commit fraud, harass others, or mislead people unlawfully.`,
      `Attempt to reverse engineer, disrupt, damage, or overload the Services.`,
      `Bypass coin requirements, payment systems, usage limits, or security controls.`,
      `Use unauthorized scraping, bots, or automated abuse tools against Pictrify.`,
    ] },
    `We may restrict access, remove content, withhold generations, or suspend accounts when reasonably necessary to enforce these Terms or comply with applicable law.`,
  ]],
  ['8. Intellectual Property and Generated Images', [
    { ul: [
      `Pictrify's branding, website design, software, templates, user interface, and platform technology are owned by Pictrify or its licensors.`,
      `Subject to applicable law and any specific template, model, or plan restrictions, you may use generated images for personal or commercial purposes.`,
      `You are responsible for ensuring that your use of generated images complies with applicable laws and third-party rights.`,
      `We do not guarantee that AI-generated outputs are unique or eligible for copyright protection in every jurisdiction.`,
      `You may not copy, resell, redistribute, or commercially exploit Pictrify's proprietary platform elements without authorization.`,
      `Feedback you provide may be used to improve the Services without an obligation to compensate you.`,
    ] },
  ]],
  ['9. Payments, Refunds, and Cancellations', [
    { ul: [
      `Purchases are subject to the applicable Refund and Cancellation Policy.`,
      `You authorize the selected payment provider to process the amounts associated with your purchase or subscription.`,
      `Taxes, currency conversion fees, and bank charges may apply depending on your location and payment method.`,
      `If a payment fails, is reversed, or is disputed, access to paid features may be restricted until the issue is resolved.`,
      `Subscription cancellations and any applicable refunds will be handled according to the relevant plan terms and published policies.`,
    ] },
    `Please review our Refund and Cancellation Policy before purchasing coins or a subscription.`,
  ]],
  ['10. Third-Party Services', [
    `Pictrify may rely on third-party AI model providers, hosting infrastructure, analytics services, and payment gateways to operate its Services.`,
    `Your use of third-party services may be subject to their respective terms and privacy policies. Pictrify is not responsible for independent third-party services beyond the responsibilities imposed by applicable law.`,
  ]],
  ['11. Disclaimer of Warranties', [
    `THE SERVICES ARE PROVIDED ON AN “AS IS” AND “AS AVAILABLE” BASIS TO THE MAXIMUM EXTENT PERMITTED BY APPLICABLE LAW.`,
    `Pictrify disclaims warranties to the extent legally permitted, including implied warranties of merchantability, fitness for a particular purpose, and non-infringement.`,
    `AI-generated photos are creative outputs and may not accurately represent a person's actual appearance. Pictrify does not guarantee specific results, uninterrupted service, or suitability for every intended use.`,
    `Nothing in these Terms excludes consumer rights or warranties that cannot legally be excluded.`,
  ]],
  ['12. Limitation of Liability', [
    `To the maximum extent permitted by applicable law, Pictrify will not be liable for indirect, incidental, special, consequential, or punitive damages, including lost profits, lost data, or business interruption arising from the use of the Services.`,
    `To the extent permitted by law, Pictrify's total liability for a claim relating to the Services will be limited to the amount you paid to Pictrify for the specific purchase giving rise to the claim during the three (3) months preceding the event.`,
    `Nothing in these Terms limits liability that cannot legally be limited or excluded.`,
  ]],
  ['13. Indemnification', [
    `To the extent permitted by applicable law, you agree to indemnify and hold Pictrify and its affiliates harmless from claims, damages, losses, and reasonable expenses arising from your User Content, misuse of the Services, violation of these Terms, or infringement of another person's rights.`,
  ]],
  ['14. Suspension and Termination', [
    `We may suspend or terminate your access to Pictrify if you violate these Terms, if required by law, or if necessary to protect the platform, users, or third parties.`,
    `You may stop using Pictrify at any time. Subscription cancellation and access to previously purchased coins or benefits will be governed by the applicable plan terms and published policies.`,
    `Provisions that by their nature should survive termination, including intellectual property, disclaimers, limitations of liability, and indemnification, will survive to the extent permitted by law.`,
  ]],
  ['15. Changes to the Services or Terms', [
    `We may update or modify features, AI models, templates, pricing, coin costs, and these Terms from time to time.`,
    `Updated Terms will be posted on this page with a revised effective date where appropriate. Where required by law, we will provide notice or obtain consent for material changes.`,
    `Continued use of Pictrify after updated Terms take effect constitutes acceptance of the revised Terms to the extent permitted by applicable law.`,
  ]],
  ['16. Governing Law', [
    `These Terms are governed by the laws applicable to the legal entity operating Pictrify, subject to any mandatory consumer protection laws that apply in your jurisdiction.`,
    `Nothing in this section deprives consumers of protections that cannot legally be waived.`,
  ]],
  ['17. Contact Us', [
    `For questions about these Terms, payments, subscriptions, or account issues, please contact:`,
    { kv: ['Email:', 'support@pictrify.com'] },
    { kv: ['Website:', 'https://pictrify.com', 'https://pictrify.com'] },
    `Please replace the contact details above if your actual support email or website URL is different.`,
  ]],
]
