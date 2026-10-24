/*
================================================================================
FILE: frontend/src/dictionary/DictionaryViewContext.ts
SUMMARY
    View invalidation identity shared by search, picker and detail consumers.
BASIC IDEA
    Keep document revision distinct from imports/snapshot generations.
INPUTS / INPUT SOURCES
    App's current dictionary view notifications.
EXPECTED OUTPUT
    Explicit effect dependencies for asynchronous dictionary readers.
================================================================================
*/
import { createContext, useContext } from "react";
export const DictionaryViewContext = createContext({ revision: 0, viewGeneration: "" });
export const useDictionaryView = () => useContext(DictionaryViewContext);
