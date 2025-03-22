# Rico UI Components and Design System

## UI Component Structure

Rico uses a modular component approach with the following organization:

### Component Categories

- **Layout Components**: Page structure components (header, footer, sidebar)
- **Form Components**: Input fields, buttons, selectors
- **Data Display**: Tables, cards, lists for displaying data
- **Feedback Components**: Toast notifications, alerts, progress indicators
- **Chat Components**: Messaging interface, message bubbles, input area

### UI Libraries

- **Tailwind CSS**: Primary styling approach
- **Radix UI**: Accessible primitives (dialogs, dropdowns, etc.)
- **lucide-react**: Icon set
- **class-variance-authority**: Component variants
- **tailwind-merge**: Utility for merging Tailwind classes
- **framer-motion**: Animations

## Key Components Reference

### Button Component
- Supports various sizes, variants, and states
- Used for primary actions throughout the app
- Recently enhanced with modern styling and better accessibility

### Account Selector
- Dropdown for switching between accounts
- Shows account name and type (personal/shared)

### Chat Interface
- Chat window with message history
- Input area with text input and action buttons
- Support for image uploads and camera capture
- Recently improved with better button layout and styling

### Account Settings
- Account management interface
- Includes "Danger Zone" with account deletion functionality
- Uses AlertDialog for confirmation of destructive actions

## Recent UI Improvements

- **Button Component**: Enhanced with modern styling and better accessibility
- **Chat Interface**: Improved layout with better space utilization
- **Image Upload**: Full-width buttons for better mobile experience
- **Camera Capture**: Improved to use device camera API directly
- **Chat Input**: Better keyboard navigation and form submission

## Responsive Design

- Mobile-first approach
- Breakpoints follow Tailwind CSS defaults:
  - sm: 640px
  - md: 768px
  - lg: 1024px
  - xl: 1280px
  - 2xl: 1536px

## Design Guidelines

- **Spacing**: Consistent spacing using Tailwind's spacing scale
- **Typography**: Hierarchical type system with clear heading levels
- **Colors**: Primary brand colors with light/dark mode variants
- **Interactive Elements**: Clear hover/focus states for all interactive elements
- **Loading States**: Skeleton loaders for content loading
- **Error States**: Clear error messaging with visual differentiation

## Accessibility Considerations

- Semantic HTML structure
- ARIA attributes for complex components
- Keyboard navigation support
- Focus management for modals and dialogs
- Color contrast compliance
- Screen reader friendly text alternatives
