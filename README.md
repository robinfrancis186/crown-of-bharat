# Crown of Bharat

[Play the game](https://monsoon-kingdoms.vercel.app/) · [Deployment setup](DEPLOYMENT.md)

An Indian-inspired strategy game designed for mobile landscape: build a kingdom, upgrade 15 building types through 15 visual levels, prepare troops and heroes, and fight campaign, practice and online battles.

```sh
npm ci
npm start
```

Open http://localhost:5191/monsoon-kingdoms/.

Game source and authoring scripts are in `monsoon-kingdoms/`. The private GitHub repository is connected to Vercel; pushes to `main` run checks and deploy. Supabase provides the existing online RPC backend. See `DEPLOYMENT.md` for source-backup exclusions and backend verification.
