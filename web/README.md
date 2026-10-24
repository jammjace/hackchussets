This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Run the integrated app (PowerShell)

Start the FastAPI backend from the repository root in one window:

```powershell
python -m pip install -e ".[dev]"
python -m pip install -r backend\requirements.txt
$env:MODULE_A_MODE = "mock"
Set-Location backend
python -m uvicorn app:app --reload --port 8000
```

Start Next.js in a second window:

```powershell
Set-Location web
npm ci
$env:NEXT_PUBLIC_API_BASE = "http://localhost:8000"
npm run dev
```

Open [http://localhost:3000](http://localhost:3000), then upload
`samples/test1.mp4` or `samples/test2.mp4`. The mock mode uses deterministic
recorded Qwen predictions and does not require Qwen, CUDA, or a GPU.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
