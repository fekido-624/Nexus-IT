# **App Name**: IT Asset Nexus

## Core Features:

- Local-First Persistence: Securely stores all user, asset, and unit data using local storage for full offline functionality and immediate load times.
- Unit-Level Serial Tracking: Track every individual hardware unit with unique serial numbers, purchase history, and real-time condition monitoring.
- Asset Catalogue with Image Encoding: Responsive card-based gallery for users to browse hardware with support for Base64 image uploads or category-based placeholders.
- Assignment & Approval Workflow: Two-stage approval process allowing admins to assign specific available serial numbers to staff borrowing requests.
- Administrative Statistics Dashboard: Real-time overview of total inventory value, borrowed versus available assets, and automated warranty expiration alerts.
- Role-Based Local Authentication: Seamless login simulation with dedicated interface routing for Administrative and Staff access levels based on persistent local session tokens.
- Dynamic Borrowing Ledger: Personalized request tracking for users to monitor status, review return deadlines, and view assigned equipment details.

## Style Guidelines:

- Primary Color: Deep Professional Blue (#1D6FA4), providing a trustworthy and authoritative presence suitable for institutional IT environments.
- Background Color: Crisp Arctic Mist (#F2F5F8), a light-mode layout using a highly desaturated blue hue for clarity and reduced eye strain during management tasks.
- Accent Color: Stately Indigo (#4D59B3), utilized for hover effects and non-primary navigation cues to create a sophisticated, analogous contrast.
- Primary Font: 'Inter' – a neutral, grotesque-style sans-serif used across all levels for a modern, objective look that prioritizes data readability.
- Mobile-optimized architecture with a fixed bottom-tab navigation for staff and a robust sidebar-focused layout for administrative dashboards.
- Micro-interactions including card lift effects and toast notification slide-ins to provide tactile feedback for CRUD operations.
- Category-driven SVG icons paired with colored status badges (Green: Available, Yellow: Pending, Red: Lost/Broken) for high-speed scanning.