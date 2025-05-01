// src/context/GmailContext.js
import React, { createContext, useState } from 'react';

export const GmailContext = createContext();

export const GmailProvider = ({ children }) => {
  const [phishingResult, setPhishingResult] = useState(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);

  return (
    <GmailContext.Provider value={{ phishingResult, setPhishingResult, showDetailsModal, setShowDetailsModal }}>
      {children}
    </GmailContext.Provider>
  );
};