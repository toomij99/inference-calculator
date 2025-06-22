import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import LlamaInferenceCalculator from './llama_inference_calculator.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <LlamaInferenceCalculator />
  </StrictMode>,
)
