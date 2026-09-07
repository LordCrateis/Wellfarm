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
