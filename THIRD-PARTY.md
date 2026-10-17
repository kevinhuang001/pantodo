# Third-party notices

## Lucide

The inline icon geometry in `src/components/Icon.tsx` is derived from [Lucide](https://lucide.dev),
which is licensed under the **ISC License**. Icons are inlined as SVG paths (rendered at
`stroke-width="1.8"`, matching the visual language of
[Glassmark](https://github.com/kevinhuang001/bookmark-web)) so that Pantodo ships no icon runtime
dependency.

```
ISC License

Copyright (c) for portions of Lucide are held by Cole Bemis 2013-2022 as part of Feather (MIT).
All other copyright (c) for Lucide are held by Lucide Contributors 2022.

Permission to use, copy, modify, and/or distribute this software for any purpose with or without fee
is hereby granted, provided that the above copyright notice and this permission notice appear in all
copies.

THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES WITH REGARD TO THIS SOFTWARE
INCLUDING ALL IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS. IN NO EVENT SHALL THE AUTHOR BE
LIABLE FOR ANY SPECIAL, DIRECT, INDIRECT, OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES WHATSOEVER
RESULTING FROM LOSS OF USE, DATA OR PROFITS, WHETHER IN AN ACTION OF CONTRACT, NEGLIGENCE OR OTHER
TORTIOUS ACTION, ARISING OUT OF OR IN CONNECTION WITH THE USE OR PERFORMANCE OF THIS SOFTWARE.
```

## Visual design reference

The frosted-glass visual language, palette anchors and key metrics (accent `#2d6d95`, 30px glass
blur, 20px window radius, cool low-alpha shadows) are inherited from the author's earlier project
**Glassmark** — `kevinhuang001/bookmark-web`. No code is copied from it; the values were consolidated
into `src/styles/tokens.css` and a dark palette was added (Glassmark is light-only).

## Native power monitor

`src-tauri/vendor/tauri-plugin-power-monitor` is tauri-plugin-power-monitor 0.1.0 from https://github.com/marrionesa/tauri-plugin-power-monitor, under MIT OR Apache-2.0 (license texts included). Pantodo replaces the macOS snapshot destructor with CoreFoundation `CFRelease`, as required by the IOPowerSources Copy API.

## shadcn/ui and Radix

The components in `src/components/ui` originate from the shadcn/ui new-york-v4 registry (https://ui.shadcn.com), MIT licensed, copyright shadcn. Imports, translations and theme tokens are adapted for Pantodo. Radix UI primitives, Tailwind CSS, class-variance-authority, clsx and tailwind-merge are MIT licensed; Lucide icons are ISC licensed; React DayPicker is MIT licensed.
