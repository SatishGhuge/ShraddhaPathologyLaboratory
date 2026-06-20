/**
 * SAMPLE STATUS WORKFLOW - COLOR CODING REFERENCE
 * 
 * This file documents the color scheme for all sample stages
 * Use these colors consistently across the frontend
 */

// ============================================
// STATUS COLOR DEFINITIONS
// ============================================

export const STATUS_COLORS = {
  // Stage 1: Gray - Awaiting Sample Collection
  'Registered': {
    bgColor: 'bg-gray-100',
    textColor: 'text-gray-700',
    borderColor: 'border-gray-300',
    tailwindColor: 'gray',
    hexColor: '#9CA3AF',
    lightHexColor: '#F3F4F6',
    icon: '📄',
    description: 'Awaiting sample collection'
  },

  // Stage 2: Blue - Sample Received
  'Received': {
    bgColor: 'bg-blue-100',
    textColor: 'text-blue-700',
    borderColor: 'border-blue-300',
    tailwindColor: 'blue',
    hexColor: '#3B82F6',
    lightHexColor: '#EFF6FF',
    icon: '📦',
    description: 'Sample received at lab'
  },

  // Stage 3: Purple - Results Entered
  'Entered': {
    bgColor: 'bg-purple-100',
    textColor: 'text-purple-700',
    borderColor: 'border-purple-300',
    tailwindColor: 'purple',
    hexColor: '#A855F7',
    lightHexColor: '#F3E8FF',
    icon: '✏️',
    description: 'Results entered in system'
  },

  // Stage 4: Purple - Under Validation
  'Validation': {
    bgColor: 'bg-purple-100',
    textColor: 'text-purple-700',
    borderColor: 'border-purple-300',
    tailwindColor: 'purple',
    hexColor: '#8B5CF6',
    lightHexColor: '#F5F3FF',
    icon: '✓',
    description: 'Under validation by technician'
  },

  // Stage 5: Green - Authorized
  'Authorized': {
    bgColor: 'bg-green-100',
    textColor: 'text-green-700',
    borderColor: 'border-green-300',
    tailwindColor: 'green',
    hexColor: '#10B981',
    lightHexColor: '#ECFDF5',
    icon: '🛡️',
    description: 'Authorized by senior technician'
  },

  // Stage 6: Green - Delivered
  'Delivered': {
    bgColor: 'bg-green-100',
    textColor: 'text-green-700',
    borderColor: 'border-green-300',
    tailwindColor: 'green',
    hexColor: '#22C55E',
    lightHexColor: '#F0FDF4',
    icon: '📤',
    description: 'Report delivered to patient'
  },

  // Stage 7: Red - Changes After Delivery
  'Rectified': {
    bgColor: 'bg-red-100',
    textColor: 'text-red-700',
    borderColor: 'border-red-300',
    tailwindColor: 'red',
    hexColor: '#EF4444',
    lightHexColor: '#FEF2F2',
    icon: '⚠️',
    description: 'Changes made after delivery'
  }
};

// ============================================
// STATUS BADGE COMPONENT
// ============================================

import React from 'react';

interface StatusBadgeProps {
  status: string;
  showIcon?: boolean;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'badge' | 'pill' | 'outline';
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({
  status,
  showIcon = true,
  size = 'md',
  variant = 'badge'
}) => {
  const config = STATUS_COLORS[status as keyof typeof STATUS_COLORS];
  
  if (!config) {
    return <span className="text-gray-500">Unknown Status</span>;
  }

  const sizeClasses = {
    sm: 'px-2 py-1 text-xs',
    md: 'px-3 py-1.5 text-sm',
    lg: 'px-4 py-2 text-base'
  };

  const variantClasses = {
    badge: `${config.bgColor} ${config.textColor} rounded`,
    pill: `${config.bgColor} ${config.textColor} rounded-full`,
    outline: `border ${config.borderColor} ${config.textColor} bg-white rounded`
  };

  return (
    <span className={`inline-flex items-center gap-1 font-medium ${sizeClasses[size]} ${variantClasses[variant]}`}>
      {showIcon && <span>{config.icon}</span>}
      {status}
    </span>
  );
};

// ============================================
// STATUS CARD COMPONENT (Larger Display)
// ============================================

export const StatusCard: React.FC<{ status: string; showDescription?: boolean }> = ({
  status,
  showDescription = true
}) => {
  const config = STATUS_COLORS[status as keyof typeof STATUS_COLORS];
  
  if (!config) return null;

  return (
    <div className={`${config.bgColor} border-l-4 ${config.borderColor} p-4 rounded`}>
      <div className="flex items-center gap-2">
        <span className="text-2xl">{config.icon}</span>
        <div>
          <h3 className={`${config.textColor} font-bold text-lg`}>{status}</h3>
          {showDescription && (
            <p className={`${config.textColor} text-sm opacity-75`}>{config.description}</p>
          )}
        </div>
      </div>
    </div>
  );
};

// ============================================
// STATUS PROGRESS TIMELINE
// ============================================

const STAGES = ['Registered', 'Received', 'Entered', 'Validation', 'Authorized', 'Delivered', 'Rectified'];

export const StatusTimeline: React.FC<{ currentStatus: string }> = ({ currentStatus }) => {
  const currentIndex = STAGES.indexOf(currentStatus);

  return (
    <div className="flex items-center justify-between gap-2">
      {STAGES.map((stage, index) => {
        const config = STATUS_COLORS[stage as keyof typeof STATUS_COLORS];
        const isCompleted = index < currentIndex;
        const isCurrent = index === currentIndex;

        return (
          <React.Fragment key={stage}>
            {/* Stage Circle */}
            <div className="flex flex-col items-center">
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center font-bold ${
                  isCurrent
                    ? `${config.bgColor} ${config.textColor} ring-2 ring-offset-2 ${config.borderColor}`
                    : isCompleted
                    ? 'bg-green-100 text-green-700'
                    : 'bg-gray-200 text-gray-500'
                }`}
              >
                {isCompleted ? '✓' : isCurrent ? config.icon : index + 1}
              </div>
              <span className="text-xs font-semibold text-gray-600 mt-2 text-center max-w-[60px]">
                {stage}
              </span>
            </div>

            {/* Connector Line */}
            {index < STAGES.length - 1 && (
              <div
                className={`flex-1 h-1 rounded ${
                  index < currentIndex
                    ? 'bg-green-400'
                    : isCurrent
                    ? 'bg-yellow-400'
                    : 'bg-gray-200'
                }`}
              />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
};

// ============================================
// STATUS SUMMARY DASHBOARD
// ============================================

interface StatusCounts {
  [key: string]: number;
}

export const StatusSummaryDashboard: React.FC<{ counts: StatusCounts }> = ({ counts }) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {STAGES.map(stage => {
        const config = STATUS_COLORS[stage as keyof typeof STATUS_COLORS];
        const count = counts[stage] || 0;

        return (
          <div
            key={stage}
            className={`${config.bgColor} ${config.borderColor} border rounded-lg p-4`}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className={`${config.textColor} text-sm font-medium`}>{stage}</p>
                <p className={`${config.textColor} text-2xl font-bold`}>{count}</p>
              </div>
              <span className="text-3xl opacity-50">{config.icon}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
};

// ============================================
// USAGE EXAMPLES
// ============================================

/*
// Example 1: Simple Status Badge
<StatusBadge status="Authorized" showIcon={true} size="md" variant="badge" />

// Example 2: Status in a result row
<tr>
  <td>{testName}</td>
  <td>
    <StatusBadge status={test.status} variant="pill" />
  </td>
</tr>

// Example 3: Large status card
<StatusCard status={currentStatus} showDescription={true} />

// Example 4: Progress timeline
<StatusTimeline currentStatus="Entered" />

// Example 5: Dashboard summary
<StatusSummaryDashboard counts={{
  "Registered": 5,
  "Received": 12,
  "Entered": 8,
  "Validation": 3,
  "Authorized": 2,
  "Delivered": 45,
  "Rectified": 1
}} />

// Example 6: Custom styling
const testStatus = 'Authorized';
const colors = STATUS_COLORS[testStatus];
<div className={`${colors.bgColor} ${colors.textColor} p-4 rounded`}>
  {colors.icon} {testStatus}: {colors.description}
</div>
*/

// ============================================
// TAILWIND CONFIG COLORS (for tailwind.config.ts)
// ============================================

export const TAILWIND_WORKFLOW_COLORS = {
  workflow: {
    registered: {
      50: '#F3F4F6',
      100: '#E5E7EB',
      500: '#9CA3AF',
      700: '#374151'
    },
    received: {
      50: '#EFF6FF',
      100: '#DBEAFE',
      500: '#3B82F6',
      700: '#1D4ED8'
    },
    entered: {
      50: '#FFFBEB',
      100: '#FEF3C7',
      500: '#F59E0B',
      700: '#D97706'
    },
    validation: {
      50: '#F5F3FF',
      100: '#EDE9FE',
      500: '#8B5CF6',
      700: '#6D28D9'
    },
    authorized: {
      50: '#ECFDF5',
      100: '#D1FAE5',
      500: '#10B981',
      700: '#047857'
    },
    delivered: {
      50: '#ECFDFD',
      100: '#CFFAFE',
      500: '#06B6D4',
      700: '#0369A1'
    },
    rectified: {
      50: '#FEF2F2',
      100: '#FEE2E2',
      500: '#EF4444',
      700: '#B91C1C'
    }
  }
};

export default STATUS_COLORS;
