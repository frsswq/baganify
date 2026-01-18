<div align="center">
  <img src="public/favicon.svg" height="100" alt="baganify logo" />

  <h1>baganify</h1>

  <p>
    <strong>local-first, chart generator for the web.</strong>
  </p>

  <p>
    <a href="https://bun.sh"><img src="https://img.shields.io/badge/bun-000000?style=for-the-badge&logo=bun&logoColor=white" alt="bun" /></a>
    <a href="https://react.dev"><img src="https://img.shields.io/badge/react-20232A?style=for-the-badge&logo=react&logoColor=61DAFB" alt="react" /></a>
    <a href="https://tailwindcss.com"><img src="https://img.shields.io/badge/tailwind_css-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white" alt="tailwind css" /></a>
    <a href="https://tanstack.com"><img src="https://img.shields.io/badge/tanstack-FF4154?style=for-the-badge&logo=react-query&logoColor=white" alt="tanstack" /></a>
  </p>
</div>

<br />

## features

- **org charts**: auto-layout generation for organizational hierarchies.
- **vector graphics**: full svg support with precise path manipulation.
- **modern ui**: built with shadcn principles and base ui primitives.
- **local only**: runs entirely in your browser. no server-side data processing, ensuring complete privacy.

## run locally

clone the project and install dependencies:

```bash
git clone https://github.com/frsswq/baganify.git
cd baganify
bun install
```

start the development server:

```bash
bun run dev
```

build for production:

```bash
bun run build
```

## tech stack

- **framework**: react spa + tanstack router
- **build**: vite (static export)
- **styling**: tailwind css v4 + base ui
- **state**: zustand
- **icons**: phosphor icons