# Modern Web Template

A modern web application template built with Next.js, TypeScript, Tailwind CSS, and shadcn/ui components.

## Features

- **Next.js 14**: App Router, Server Components, and more
- **TypeScript**: Type-safe code
- **Tailwind CSS**: Utility-first CSS framework
- **shadcn/ui**: High-quality UI components
- **Neon Database Integration**: Serverless Postgres database
- **OpenAI Integration**: AI capabilities

## Getting Started

### Prerequisites

- Node.js 18.x or higher
- npm or yarn

### Installation

1. Clone the repository:

```bash
git clone https://github.com/yourusername/modern-web-template.git
cd modern-web-template
```

2. Install dependencies:

```bash
npm install
```

3. Set up environment variables:

Create a `.env` file in the root directory with the following variables:

```
# Neon database connection
NEON_DATABASE_URL=postgres://your-username:your-password@your-endpoint/your-database

# OpenAI API key
NEXT_PUBLIC_OPENAI_API_KEY=your_openai_api_key
```

4. Start the development server:

```bash
npm run dev
```

5. Open [http://localhost:3000](http://localhost:3000) in your browser.

## Project Structure

```
/
├── public/             # Static assets
├── src/
│   ├── app/            # Next.js app router
│   ├── components/     # React components
│   │   └── ui/         # shadcn/ui components
│   ├── lib/            # Utility functions and libraries
│   ├── hooks/          # Custom React hooks
│   └── types/          # TypeScript type definitions
├── .env.example        # Example environment variables
├── next.config.mjs     # Next.js configuration
├── tailwind.config.js  # Tailwind CSS configuration
└── tsconfig.json       # TypeScript configuration
```

## Customization

### Adding New Components

This project uses shadcn/ui components. You can add more components as needed.

### Styling

This project uses Tailwind CSS for styling. You can customize the theme in `tailwind.config.js`.

## Deployment

This project can be deployed to Vercel, Netlify, or any other platform that supports Next.js.

## License

This project is licensed under the MIT License - see the LICENSE file for details.
