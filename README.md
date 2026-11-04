# Newbiehoodzzzz

A guide to Ho Chi Minh City for international students, helping newcomers find study cafés, local food and activities beyond the classroom.

## Explore

- **Home** — discover the neighbourhood.
- **Newbie Cheatsheet** — practical tips for settling in.
- **About Us** — meet the team.
- **Lock In** — find study cafés.
- **Local Bites** — explore local food.
- **Side Quests** — discover activities and experiences.

Place listings include search, filters, photo galleries and Google Maps links.

## Run locally

Built with Next.js, TypeScript and Tailwind CSS. Requires Node.js 22 and npm.

```sh
npm ci
npm run dev
```

Open [localhost:3000](http://localhost:3000).

## Commands

```sh
npm run lint        # Check code style
npm run type-check  # Check TypeScript
npm test            # Run tests
npm run build       # Generate the static website in out/
```

The site uses static content and Cloudinary image delivery, with no backend or database. Before publishing, set `SITE_URL` to the production HTTPS origin and `SITE_INDEXABLE=true`, then build.
