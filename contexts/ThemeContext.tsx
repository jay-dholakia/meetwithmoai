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
    background: '#FEFFFE', // Clean white with subtle warmth
    surface: '#F0F5F0', // Slightly darker matcha-tinted surface for better contrast
    primary: '#6B8E23', // Rich matcha green
    secondary: '#8FBC8F', // Soft sage green
    text: '#2D3D2D', // Dark charcoal for readability
    textSecondary: '#6B7B6B', // Muted green-gray
    border: '#DDE8DD', // Slightly darker matcha border for better definition
    success: '#4CAF50', // Matcha success green
    error: '#FF5252',
    warning: '#FFC107',
  },
  spacing: {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
  },
  borderRadius: {
    sm: 4,
    md: 8,
    lg: 12,
    xl: 16,
  },
  typography: {
    h1: {
      fontSize: 32,
      fontFamily: 'InterTight-Bold',
      fontWeight: '700',
    },
    h2: {
      fontSize: 24,
      fontFamily: 'InterTight-SemiBold',
      fontWeight: '600',
    },
    h3: {
      fontSize: 20,
      fontFamily: 'InterTight-Medium',
      fontWeight: '500',
    },
    body: {
      fontSize: 16,
      fontFamily: 'Inter-Regular',
      fontWeight: '400',
    },
    caption: {
      fontSize: 14,
      fontFamily: 'Inter-Regular',
      fontWeight: '400',
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





