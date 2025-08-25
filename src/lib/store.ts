import { create } from 'zustand'

interface SurveyState {
  surveys: {id : string, name : string}[]
  loading: boolean
  setSurveys: (surveys: {id : string, name : string}[]) => void
  setLoading: (loading: boolean) => void
}

export const useSurveyStore = create<SurveyState>()((set) => ({
  surveys: [],
  loading: true,
  setSurveys: (surveys) => set({ surveys }),
  setLoading: (loading) => set({ loading }),
}))
