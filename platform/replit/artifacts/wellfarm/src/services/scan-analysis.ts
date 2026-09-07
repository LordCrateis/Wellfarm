import type { Crop } from "@workspace/api-client-react";
import type { Severity } from "@/data/mock";

export interface AnalysisCandidate {
  condition: string;
  confidence: number;
}

export interface ScanAnalysisResult {
  mode: "preview" | "model";
  crop: Crop;
  supported: boolean;
  lowConfidence?: boolean;
  candidates: AnalysisCandidate[];
  severity: Severity;
  severityBasis: string;
  imageQuality: {
    status: "pending" | "good" | "fair" | "poor";
    label: string;
    guidance: string;
  };
  model: {
    name: string;
    version: string;
    connected: boolean;
  };
  summary: string;
  safeActions: string[];
  limitations: string[];
}

const previewCandidates: Record<Crop, AnalysisCandidate[]> = {
  Rice: [
    { condition: "Bacterial leaf blight", confidence: 0.72 },
    { condition: "Brown spot", confidence: 0.18 },
    { condition: "Leaf blast", confidence: 0.1 },
  ],
  Wheat: [
    { condition: "Leaf rust", confidence: 0.67 },
    { condition: "Yellow rust", confidence: 0.21 },
    { condition: "Healthy", confidence: 0.12 },
  ],
  Maize: [
    { condition: "Northern leaf blight", confidence: 0.64 },
    { condition: "Common rust", confidence: 0.23 },
    { condition: "Gray leaf spot", confidence: 0.13 },
  ],
  Cotton: [
    { condition: "Bacterial blight", confidence: 0.61 },
    { condition: "Leaf curl disease", confidence: 0.25 },
    { condition: "Healthy", confidence: 0.14 },
  ],
  Sugarcane: [
    { condition: "Red rot", confidence: 0.69 },
    { condition: "Rust", confidence: 0.19 },
    { condition: "Yellow leaf disease", confidence: 0.12 },
  ],
  Soybean: [
    { condition: "Bacterial blight", confidence: 0.63 },
    { condition: "Frogeye leaf spot", confidence: 0.24 },
    { condition: "Healthy", confidence: 0.13 },
  ],
  Tomato: [
    { condition: "Early blight", confidence: 0.66 },
    { condition: "Septoria leaf spot", confidence: 0.2 },
    { condition: "Late blight", confidence: 0.14 },
  ],
  Potato: [
    { condition: "Early blight", confidence: 0.65 },
    { condition: "Late blight", confidence: 0.24 },
    { condition: "Healthy", confidence: 0.11 },
  ],
};

export function createPreviewAnalysis(crop: Crop): ScanAnalysisResult {
  return {
    mode: "preview",
    crop,
    supported: true,
    candidates: previewCandidates[crop],
    severity: "moderate",
    severityBasis:
      "Severity will combine the selected condition, visible extent, and nearby-plant answers.",
    imageQuality: {
      status: "pending",
      label: "Check pending",
      guidance: "Sharpness, lighting, and crop coverage will be checked by the inference service.",
    },
    model: {
      name: "Wellfarm Vision",
      version: "integration pending",
      connected: false,
    },
    summary:
      "This preview demonstrates how ranked model indications will appear. The uploaded image has not yet been classified.",
    safeActions: [
      "Inspect nearby plants and photograph any similar symptoms.",
      "Keep one clear close-up and one whole-plant photo for comparison.",
      "Consult a qualified local agricultural professional if symptoms spread quickly.",
    ],
    limitations: [
      "This screen is not a confirmed diagnosis.",
      "Do not select or apply a chemical product from this result alone.",
      "Weather and location provide context; they do not confirm a disease.",
    ],
  };
}
