import Image from "next/image";

type Testimonial = { id: string; name: string; title: string; company: string; quote: string; avatarUrl: string | null };

export default function Testimonials({ items }: { items: Testimonial[] }) {
  if (!items.length) return null;
  return <section className="border-y border-border-light bg-corp-teal-50 px-4 py-16 sm:px-6 lg:px-8 lg:py-20" aria-labelledby="social-proof-title">
    <div className="mx-auto max-w-8xl"><p className="text-center text-xs font-bold uppercase tracking-ultra text-corp-coral">Müşterilerimiz ne diyor?</p><h2 id="social-proof-title" className="mx-auto mt-3 max-w-2xl text-center text-3xl font-bold tracking-tight text-corp-teal sm:text-4xl">Birlikte büyüyen markalardan</h2>
      <div className="mt-10 grid gap-5 md:grid-cols-3">{items.map((item) => <figure key={item.id} className="flex h-full flex-col rounded-2xl border border-border-light bg-white p-6 shadow-card"><blockquote className="flex-1 text-sm leading-7 text-corp-charcoal">“{item.quote}”</blockquote><figcaption className="mt-6 flex items-center gap-3 border-t border-border-light pt-5">{item.avatarUrl ? <Image src={item.avatarUrl} alt="" width={40} height={40} className="h-10 w-10 rounded-full object-cover" unoptimized /> : <span aria-hidden="true" className="flex h-10 w-10 items-center justify-center rounded-full bg-corp-coral-light text-sm font-bold text-corp-coral">{item.name.charAt(0)}</span>}<span><strong className="block text-sm text-corp-teal">{item.name}</strong><span className="text-xs text-corp-gray">{item.title} · {item.company}</span></span></figcaption></figure>)}</div>
    </div>
  </section>;
}
