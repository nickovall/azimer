# AZIMER Public Contact Data

Date added: 2026-06-05

Use this file for public contact UI, CTA blocks, and KP/PDF contact actions.

## Approved Contacts

- Contact person: Азамат Мавлянов
- Phone display: +7 901 600-05-65
- Phone href: `tel:+79016000565`
- VK handle: `@mavlyanov2018`
- VK profile URL: `https://vk.com/mavlyanov2018`
- VK chat URL: `https://vk.me/mavlyanov2018`
- Email: `azimer_sk@mail.ru` (temporarily reverted 2026-06-25 — Cloudflare forwarding of `info@azimer.ru` was silently failing/losing mail; restore `info@azimer.ru` once it lives on a real VK WorkSpace mailbox)
- Email href: `mailto:azimer_sk@mail.ru`
- Note: Resend outbound sender stays `info@azimer.ru` (send.azimer.ru envelope works) — only the public site contact email was reverted.

## QR Target

The QR code in generated KP/PDF should open the main website:

`https://azimer.ru/`

If the owner provides the branded QR bitmap as a file, use that asset. If not,
generate a scan-safe QR for the website URL. Do not over-style the QR if it
hurts scan reliability.

## UI Usage Rules

- Do not dump every legal field into every block.
- Header: phone or compact "Написать" action is enough.
- Mobile menu/sticky action: phone + VK chat + estimate.
- Footer: phone, VK chat, city, compact INN/OGRN if space allows.
- Contacts page: phone, VK chat, address/legal details can be fuller.
- KP/PDF: include phone, VK chat label, and QR to the website.
- Do not invent WhatsApp, Telegram, or email if not explicitly approved.
