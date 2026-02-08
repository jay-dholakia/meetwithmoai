import React, { createContext, useContext } from 'react';

export interface Theme {
  colors: {
    background: string;
    surface: string;
    primary: string;
    secondary: string;
    text: string;
    textSecondary: string;
    border: string;
    success: string;
    error: string;
    warning: string;
  };
  spacing: {
    xs: number;
    sm: number;
    md: number;
    lg: number;
    xl: number;
  };
  borderRadius: {
    sm: number;
    md: number;
    lg: number;
    xl: number;
  };
  typography: {
    h1: {
      fontSize: number;
      fontFamily: string;
      fontWeight: string;
    };
    h2: {
      fontSize: number;
      fontFamily: string;
      fontWeight: string;
    };
    h3: {
      fontSize: number;
      fontFamily: string;
      fontWeight: string;
    };
    body: {
      fontSize: number;
      fontFamily: string;
      fontWeight: string;
    };
    caption: {
      fontSize: number;
      fontFamily: string;
      fontWeight: string;
    };
  };
}

const theme: Theme = {
  colors: {
    background: '#FAFBFC', // Softer, warmer background
    surface: '#FFFFFF', // Pure white for cards
    primary: '#5B9BD5', // Softer, more refined blue
    secondary: '#FF9F66', // Softer orange accent
    text: '#0F172A', // Softer near-black
    textSecondary: '#64748B', // Softer gray
    border: '#E2E8F0', // Softer, more subtle borders
    success: '#22C55E', // Softer green
    error: '#F87171', // Softer red
    warning: '#FBBF24', // Softer amber
  },
  spacing: {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
    xxl: 48,
  },
  borderRadius: {
    sm: 6,
    md: 12,
    lg: 16,
    xl: 24,
  },
  typography: {
    h1: {
      fontSize: 32,
      fontFamily: 'InterTight-Bold',
      fontWeight: '700',
      lineHeight: 40,
      letterSpacing: -0.5,
    },
    h2: {
      fontSize: 24,
      fontFamily: 'InterTight-SemiBold',
      fontWeight: '600',
      lineHeight: 32,
      letterSpacing: -0.3,
    },
    h3: {
      fontSize: 20,
      fontFamily: 'InterTight-Medium',
      fontWeight: '500',
      lineHeight: 28,
      letterSpacing: -0.2,
    },
    body: {
      fontSize: 16,
      fontFamily: 'Inter-Regular',
      fontWeight: '400',
      lineHeight: 24,
    },
    caption: {
      fontSize: 14,
      fontFamily: 'Inter-Regular',
      fontWeight: '400',
      lineHeight: 20,
    },
  },
};

const ThemeContext = createContext<Theme>(theme);

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};

interface ThemeProviderProps {
  children: React.ReactNode;
}

export const ThemeProvider: React.FC<ThemeProviderProps> = ({ children }) => {
  return (
    <ThemeContext.Provider value={theme}>
      {children}
    </ThemeContext.Provider>
  );
};





