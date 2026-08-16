# PAVii website

This repository powers [pavii.tech](https://www.pavii.tech/), the public website for PAVii.AI.

PAVii is a local-first, model-agnostic desktop assistant for AI agents that works for you and works with you. The website presents PAVii products, services, documentation, screenshots, and verified desktop downloads.

## PAVii 2.0.4 downloads

- [Windows x64 installer](https://github.com/buckleson/Pavii/releases/latest/download/PAVii-Windows-x64-setup.exe)
- [macOS Apple Silicon DMG](https://github.com/buckleson/Pavii/releases/latest/download/PAVii-macOS-arm64.dmg)
- [Linux x64 AppImage](https://github.com/buckleson/Pavii/releases/latest/download/PAVii-Linux-x64.AppImage)
- [Linux x64 DEB](https://github.com/buckleson/Pavii/releases/latest/download/PAVii-Linux-x64.deb)
- [Linux x64 RPM](https://github.com/buckleson/Pavii/releases/latest/download/PAVii-Linux-x64.rpm)
- [Release checksums](https://github.com/buckleson/Pavii/releases/latest/download/SHA256SUMS)

The macOS download supports Apple Silicon only. It is ad-hoc signed and integrity-checked but not Apple-notarized, so Gatekeeper may report that PAVii is “damaged.” First drag PAVii into Applications, then Control-click it and choose **Open**. If it remains blocked, run `xattr -dr com.apple.quarantine "/Applications/PAVii.app"` once. The command must target the installed copy in Applications, not the app inside the mounted DMG. The Super Assistant page displays these steps beside the macOS download and provides a copy button plus support checks.

## Development

```shell
pnpm install
pnpm dev
```

Create a production build with:

```shell
pnpm build
```

The website is built with Astro and Tailwind CSS. Production deployments are handled by the repository's GitHub Pages workflow.
