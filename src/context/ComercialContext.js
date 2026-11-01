import {createContext,useContext} from 'react';
export const ComercialContext=createContext(null);
export function useComercial(){return useContext(ComercialContext);}
