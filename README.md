# vineetvora.dev

Personal portfolio site for **Vineet Vora** — ML Engineer & Full-Stack Developer, MS in AI @ NJIT.

**Live:** [vineetvora.dev](https://vineetvora.dev)

## Tech Stack

- Pure HTML / CSS / JavaScript — no frameworks, no build step
- Google Fonts (Sora + JetBrains Mono)
- Single-file architecture (`index.html`)

## Features

- **Canvas particle network** — mouse-reactive animated background with connection lines
- **Kinetic typography** — character-by-character hero text reveal
- **Custom cursor** — dot + trailing ring with hover expansion (desktop only)
- **Magnetic hover** — buttons subtly follow cursor on hover
- **Dark/light theme** — toggle with localStorage persistence, dark default
- **Film grain overlay** — SVG noise texture for depth
- **Infinite marquee** — scrolling tech stack ticker
- **Bento grid projects** — featured project with side metrics
- **Animated gradient border** — contact card with shifting gradient
- **Scroll reveal** — staggered fade-in animations via IntersectionObserver
- **Fully responsive** — mobile menu, adaptive layouts, touch-friendly

## Performance & SEO

- Optimized image (119 KB)
- Inline SVG favicon (no extra request)
- Canvas pauses when off-screen (IntersectionObserver)
- `prefers-reduced-motion` support
- Schema.org JSON-LD structured data
- Open Graph + Twitter Card meta tags
- Semantic HTML with proper heading hierarchy
- Canonical URL + robots meta

## Local Development

Just open `index.html` in a browser. No build tools needed.

```bash
# or use a local server
python3 -m http.server 8000
```

## Files

```
index.html          — entire site (HTML + CSS + JS)
vineet.jpeg         — profile photo (optimized)
Vineet_Vora.pdf     — resume
```

## License

MIT
