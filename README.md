# My Kin Map
## Why I Built This

My Kin Map is an early family tree application for bringing family relationships and memories together. It currently stores family records in this browser using IndexedDB and supports JSON backup and restore. There is no account or automatic cross-device sync in the current implementation.

**Live Demo:** [https://my-kin-map.vercel.app/](https://my-kin-map.vercel.app/)

![My Kin Map Screenshot](./public/screenshots/image.png)

## Features

- **Interactive Family Tree** - Visualize your family structure with an interactive, zoomable canvas
- **Person Management** - Add, edit, and manage individual family members
- **Relationship Tracking** - Define spouse, parent, and child relationships
- **Smart Layout** - Automatic hierarchical layout with compound couple nodes for married pairs
- **Local Storage** - Data persists in your browser with IndexedDB
- **JSON Backup** - Export and restore family data and photos
- **Responsive Design** - Works on desktop and mobile devices

## Tech Stack

- **React** 18.3 with TypeScript
- **React Flow** - Interactive node/edge canvas for graph visualization
- **Vite** - Fast build tool and dev server
- **Tailwind CSS** - Utility-first styling
- **Dexie.js** - IndexedDB wrapper for local data persistence
- **Radix UI** - Accessible component library

## Getting Started

### Prerequisites
- Node.js 18+ 
- npm or yarn

### Installation

1. Clone the repository:
```bash
git clone https://github.com/AdamJeddy/my-kin-map.git
cd my-kin-map
```

2. Install dependencies:
```bash
npm install
```

3. Start the development server:
```bash
npm run dev
```

The app will be available at `http://localhost:5173`

### Building for Production

```bash
npm run build
```

This creates an optimized build in the `dist/` directory.

## Usage

### Creating a Family Tree

1. **Add people** - Use the add button to create family members, or explore with the sample data.
2. **Link relationships** - Open a person's profile to add relatives or manage individual family groups.
3. **Explore** - Use the tree and people list to find a person; zoom and pan the tree as needed.
4. **Back up** - Export a JSON backup from Settings and keep it somewhere safe.

### Back up your data

Family information is currently stored in this browser on this device. It is not automatically synced to another device. Clearing browser data or losing the device can remove it, so export a backup from Settings regularly and keep it somewhere safe. Importing a backup merges records and replaces existing records with matching IDs.

## Project Structure

```
src/
├── components/
│   ├── tree/              # Family tree visualization
│   │   ├── FamilyTreeView.tsx    # Main tree component
│   │   ├── PersonNode.tsx        # Individual person node
│   │   ├── CoupleNode.tsx        # Married couple compound node
│   │   └── layout.ts             # Tree layout algorithm
│   ├── person/            # Profiles and relationship editing
│   └── ui/                # Reusable UI components
├── lib/
│   ├── backup.ts          # JSON backup validation and restore
│   ├── gedcom/            # GEDCOM utilities (not exposed in the UI)
│   └── utils.ts           # Utility functions
├── db/                    # IndexedDB schema and relationship operations
├── types/
│   └── index.ts           # TypeScript type definitions
└── App.tsx                # Main app component
```

## Development

### Available Scripts

- `npm run dev` - Start development server with HMR
- `npm run build` - Build for production
- `npm run lint` - Run ESLint
- `npm test` - Run the automated tests
- `npm run preview` - Preview production build locally

## Data Format

The current model keeps people and family groups as separate records. See `src/types/index.ts` for the actual types and `src/lib/backup.ts` for the JSON backup format and restore validation. GEDCOM utilities exist but are not currently exposed as a supported import/export flow.

## Project handover

- [Implementation handover](docs/revival-review/HANDOVER.md): changes, verification, limitations and suggested next work.
- [Implementation status](docs/revival-review/IMPLEMENTATION-STATUS.md): detailed progress since the original assessment.
- [Revival review and product plan](docs/revival-review/REPORT.md): original findings and product opportunities; some findings have since been addressed.
- [Product direction](PRODUCT.md) and [design direction](DESIGN.md).

## Contributing

Please review the repository's license before using or contributing code.

## Roadmap

- [ ] Multi-device sync
- [ ] Collaborative editing
- [ ] Photo gallery for family members
- [ ] Timeline view
- [ ] Mobile app

## Support

For issues, questions, or feedback, please open an issue on GitHub.

---

Made by Adam with ❤️ for family historians
