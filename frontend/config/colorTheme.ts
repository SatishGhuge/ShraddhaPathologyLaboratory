/**
 * Unified Color Theme for Shraddha Pathology Lab
 * Based on design reference images
 */

export const colorTheme = {
  // Primary Colors
  primary: {
    navy: '#1a2332',      // Dark navy for headers and primary elements
    orange: '#ff8c42',    // Vibrant orange for buttons and accents
    lightOrange: '#ffb366', // Light orange for hover states
  },

  // Status Colors
  status: {
    registered: '#3b82f6',    // Blue
    received: '#f59e0b',      // Amber/Orange
    provisional: '#ec4899',   // Pink
    authenticated: '#10b981', // Green
    delivered: '#06b6d4',     // Cyan
    collected: '#f97316',     // Orange
  },

  // Department Colors (for pie charts)
  departments: {
    pathology: '#0891b2',     // Cyan
    radiology: '#16a34a',     // Green
    microbiology: '#4f46e5',  // Indigo
  },

  // Neutral Colors
  neutral: {
    white: '#ffffff',
    lightGray: '#f9fafb',
    mediumGray: '#e5e7eb',
    darkGray: '#6b7280',
    textDark: '#1f2937',
    textLight: '#6b7280',
  },

  // Gradients
  gradients: {
    navyOrange: 'from-slate-900 to-orange-600',
    blueOrange: 'from-blue-600 to-orange-500',
    purpleOrange: 'from-purple-600 to-orange-500',
    greenOrange: 'from-green-600 to-orange-500',
  },

  // Table Styling
  table: {
    headerBg: '#1a2332',      // Navy blue
    headerText: '#ffffff',    // White text
    rowBg: '#ffffff',
    rowHoverBg: '#f9fafb',
    borderColor: '#e5e7eb',
    alternateRowBg: '#f9fafb',
  },

  // Button Styling
  button: {
    primary: '#ff8c42',       // Orange
    primaryHover: '#ff9500',
    secondary: '#1a2332',     // Navy
    secondaryHover: '#0f1419',
    danger: '#ef4444',
    success: '#10b981',
  },

  // Card Styling
  card: {
    bg: '#ffffff',
    border: '#e5e7eb',
    shadow: 'shadow-md',
    shadowHover: 'shadow-lg',
  },
};

// Tailwind class mappings for easy use
export const colorClasses = {
  // Header
  headerBg: 'bg-slate-900',
  headerText: 'text-white',

  // Table Header
  tableHeader: 'bg-slate-900 text-white',
  tableHeaderHover: 'hover:bg-slate-800',

  // Buttons
  buttonPrimary: 'bg-orange-500 hover:bg-orange-600 text-white',
  buttonSecondary: 'bg-slate-900 hover:bg-slate-800 text-white',
  buttonDanger: 'bg-red-500 hover:bg-red-600 text-white',
  buttonSuccess: 'bg-green-500 hover:bg-green-600 text-white',

  // Status Badges
  badgeRegistered: 'bg-blue-100 text-blue-800',
  badgeReceived: 'bg-amber-100 text-amber-800',
  badgeProvisional: 'bg-pink-100 text-pink-800',
  badgeAuthenticated: 'bg-green-100 text-green-800',
  badgeDelivered: 'bg-cyan-100 text-cyan-800',

  // Cards
  cardBg: 'bg-white',
  cardBorder: 'border border-gray-200',
  cardShadow: 'shadow-md hover:shadow-lg',

  // Text
  textPrimary: 'text-slate-900',
  textSecondary: 'text-gray-600',
  textMuted: 'text-gray-400',
};
