# PAVii website

This repository powers [pavii.tech](https://www.pavii.tech/), the public website for PAVii.AI.

PAVii is a local-first, model-agnostic desktop assistant for AI agents that works for you and works with you. The website presents PAVii products, services, documentation, screenshots, and verified desktop downloads.

## Pavii.Ai 2.1.66 downloads

- [Windows x64 installer](https://github.com/buckleson/Pavii-Gui-Releases/releases/latest/download/Pavii.Ai-Windows-x64-Setup.exe)
- [Windows ARM64 installer](https://github.com/buckleson/Pavii-Gui-Releases/releases/latest/download/Pavii.Ai-Windows-arm64-Setup.exe)
- [macOS Apple Silicon DMG](https://github.com/buckleson/Pavii-Gui-Releases/releases/latest/download/Pavii.Ai-macOS-arm64.dmg)
- [macOS Intel DMG](https://github.com/buckleson/Pavii-Gui-Releases/releases/latest/download/Pavii.Ai-macOS-x64.dmg)
- [Linux x64 AppImage](https://github.com/buckleson/Pavii-Gui-Releases/releases/latest/download/Pavii.Ai-Linux-x64.AppImage)
- [Linux ARM64 AppImage](https://github.com/buckleson/Pavii-Gui-Releases/releases/latest/download/Pavii.Ai-Linux-arm64.AppImage)
- [Linux x64 DEB](https://github.com/buckleson/Pavii-Gui-Releases/releases/latest/download/Pavii.Ai-Linux-x64.deb)
- [Linux ARM64 DEB](https://github.com/buckleson/Pavii-Gui-Releases/releases/latest/download/Pavii.Ai-Linux-arm64.deb)
- [Release checksums](https://github.com/buckleson/Pavii-Gui-Releases/releases/latest/download/SHA256SUMS)

Pavii.Ai 2.1.66 prepares future updates automatically in the background and asks before relaunching into the new version. Website downloads use the mirror release repository so download counts are visible on GitHub Releases. The Dev Tools and Super Assistant pages display installer choices, manual download commands, and support checks.

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
