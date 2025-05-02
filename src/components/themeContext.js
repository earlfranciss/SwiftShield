import React, { createContext, useState, useContext } from "react";

export const ThemeContext = createContext({
  theme: "dark", // Default theme
  toggleTheme: () => {},
});

export const ThemeProvider = ({ children }) => {
  const [theme, setTheme] = useState("dark"); // Or load from AsyncStorage

  const toggleTheme = () => {
    setTheme((prevTheme) => (prevTheme === "dark" ? "light" : "dark"));
    // Optional: Save theme to AsyncStorage here
  };

  console.log("<<< ThemeProvider: Current theme state:", theme); // <<< ADD LOG (Optional, logs on re-render)

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => useContext(ThemeContext);
