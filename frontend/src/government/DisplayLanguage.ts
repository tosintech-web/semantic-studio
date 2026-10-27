/*
================================================================================
FILE: frontend/src/government/DisplayLanguage.ts
SUMMARY
    Shares the dictionary label language across government views and pickers.
BASIC IDEA
    Workspace owns the language independently of UI translation. Standalone
    forms fall back to their project's selected or primary language.
INPUTS / INPUT SOURCES
    Workspace context and existing project-store language selection.
EXPECTED OUTPUT
    One label-language identity for reads, without changing authored fields.
================================================================================
*/
import {createContext,useContext} from 'react';
import {useProjectSelector} from '../state/projectStore';
export const GovernmentLanguageContext=createContext<string|null>(null);
export function useGovernmentLanguage():string {
 const provided=useContext(GovernmentLanguageContext);
 const selected=useProjectSelector(state=>state.displayLanguage??state.project?.primaryLanguage??'en');
 return provided??selected;
}
